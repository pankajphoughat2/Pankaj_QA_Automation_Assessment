import PAGE from './index.html';

/**
 * Cloudflare Worker behind the test runner page.
 * Keeps the GitHub token server-side and exposes a small JSON API:
 *   POST /api/run       start the workflow (or follow the one already running)
 *   GET  /api/run/:id   status of one run, with progress stages
 *   GET  /api/history   the last 10 runs, with report / video / source links
 */

const HISTORY_SIZE = 10;
const STAGES = ['queue', 'setup', 'browser', 'test', 'report'];

// Maps workflow step names (.github/workflows/e2e.yml) to the stages shown on the page.
const STEP_STAGE = {
  'Set up job': 'setup',
  Checkout: 'setup',
  'Set up Node.js': 'setup',
  'Install dependencies': 'setup',
  'Install Chromium': 'browser',
  'Run Playwright tests': 'test',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const gh = github(env);
    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(renderPage(env), {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        });
      }
      if (url.pathname === '/api/history' && request.method === 'GET') {
        return json(await history(gh, env));
      }
      if (url.pathname === '/api/run' && request.method === 'POST') {
        return json(await startRun(gh, env));
      }
      const match = url.pathname.match(/^\/api\/run\/(\d+)$/);
      if (match && request.method === 'GET') {
        return json(await runStatus(gh, env, match[1]));
      }
      return json({ error: 'Not found.' }, 404);
    } catch (err) {
      return json({ error: err.message || 'Something went wrong.' }, err.status || 500);
    }
  },
};

// ---- GitHub API ----

function github(env) {
  const base = `https://api.github.com/repos/${env.GITHUB_REPO}`;
  return async (path, options = {}) => {
    const res = await fetch(base + path, {
      ...options,
      headers: {
        accept: options.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'user-agent': 'hrm-test-runner',
        'x-github-api-version': '2022-11-28',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
      },
    });
    if (res.status === 204) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`GitHub answered ${res.status}: ${body.message || 'unknown error'}.`);
      err.status = 502;
      throw err;
    }
    return body;
  };
}

const workflowPath = (env) => `/actions/workflows/${env.WORKFLOW_FILE}`;
const pagesBase = (env) => {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  return `https://${owner.toLowerCase()}.github.io/${repo}/`;
};

// runs.json on gh-pages lists the runs whose report and video are published. Read it from the
// branch rather than from Pages, whose CDN caches it for several minutes.
async function publishedRuns(gh) {
  try {
    const data = await gh('/contents/runs.json?ref=gh-pages', { raw: true });
    return new Map((data.runs || []).map((r) => [String(r.runId), r]));
  } catch {
    return new Map();
  }
}

// Pages deploys a minute or so after the branch is pushed; the query string skips its CDN cache.
async function pagesServes(url) {
  try {
    const res = await fetch(`${url}?v=${Date.now()}`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function shapeRun(run, published, env) {
  const runId = String(run.id);
  const pub = published.get(runId);
  const reportUrl = `${pagesBase(env)}runs/${runId}/`;
  const repoUrl = `https://github.com/${env.GITHUB_REPO}`;
  return {
    runId,
    runNumber: run.run_number,
    status: run.status,
    conclusion: run.conclusion,
    testResult: pub ? (pub.result === 'passed' ? 'success' : 'failure') : null,
    event: run.event,
    startedAt: run.run_started_at || run.created_at,
    finishedAt: run.status === 'completed' ? run.updated_at : null,
    runUrl: run.html_url,
    commit: {
      sha: run.head_sha,
      short: run.head_sha.slice(0, 7),
      message: (run.head_commit?.message || '').split('\n')[0],
      url: `${repoUrl}/commit/${run.head_sha}`,
      treeUrl: `${repoUrl}/tree/${run.head_sha}`,
    },
    reportReady: !!pub,
    reportUrl: pub ? reportUrl : null,
    videos: pub ? (pub.videos || []).map((v) => reportUrl + v) : [],
  };
}

async function history(gh, env) {
  const [data, published] = await Promise.all([
    gh(`${workflowPath(env)}/runs?per_page=${HISTORY_SIZE}&exclude_pull_requests=true`),
    publishedRuns(gh),
  ]);
  return {
    repoUrl: `https://github.com/${env.GITHUB_REPO}`,
    latestReportUrl: pagesBase(env),
    runs: (data.workflow_runs || []).map((run) => shapeRun(run, published, env)),
  };
}

async function runStatus(gh, env, runId) {
  const [run, jobs, published] = await Promise.all([
    gh(`/actions/runs/${runId}`),
    gh(`/actions/runs/${runId}/jobs?per_page=10`),
    publishedRuns(gh),
  ]);
  const shaped = shapeRun(run, published, env);
  if (shaped.reportReady && !(await pagesServes(shaped.reportUrl))) {
    shaped.reportReady = false;
    shaped.reportUrl = null;
    shaped.videos = [];
  }
  return { ...shaped, stages: stagesOf(run, jobs.jobs || []) };
}

function stagesOf(run, jobs) {
  const state = Object.fromEntries(STAGES.map((s) => [s, 'pending']));
  const testJob = jobs.find((j) => j.name === 'Test');
  const publishJob = jobs.find((j) => j.name === 'Publish report');

  if (!testJob || testJob.status === 'queued' || testJob.status === 'waiting') {
    state.queue = run.status === 'completed' ? 'failed' : 'active';
    return state;
  }
  state.queue = 'done';

  // A stage is done when all its steps are; active if any is running; failed if any failed.
  for (const stage of ['setup', 'browser', 'test']) {
    const steps = (testJob.steps || []).filter((s) => STEP_STAGE[s.name] === stage);
    if (!steps.length) continue;
    if (steps.some((s) => s.conclusion === 'failure')) state[stage] = 'failed';
    else if (steps.every((s) => s.status === 'completed')) state[stage] = 'done';
    else if (steps.some((s) => s.status === 'in_progress' || s.status === 'completed')) state[stage] = 'active';
  }
  // The test step uses continue-on-error, so its failure shows as outcome, not conclusion.
  const testStep = (testJob.steps || []).find((s) => s.name === 'Run Playwright tests');
  const failGate = (testJob.steps || []).find((s) => s.name === 'Fail if tests failed');
  if (testStep?.status === 'completed' && failGate && failGate.conclusion === 'failure') state.test = 'failed';

  if (publishJob) {
    if (publishJob.status === 'completed') state.report = publishJob.conclusion === 'success' ? 'done' : 'failed';
    else if (publishJob.status === 'in_progress') state.report = 'active';
  } else if (testJob.status === 'completed' && run.status !== 'completed') {
    state.report = 'active';
  }
  // Finished runs: anything still pending was skipped because an earlier stage broke.
  if (run.status === 'completed') {
    for (const s of STAGES) if (state[s] === 'active') state[s] = run.conclusion === 'cancelled' ? 'failed' : 'done';
  }
  return state;
}

async function startRun(gh, env) {
  const active = await gh(`${workflowPath(env)}/runs?per_page=5&status=in_progress`);
  const queued = await gh(`${workflowPath(env)}/runs?per_page=5&status=queued`);
  const running = [...(active.workflow_runs || []), ...(queued.workflow_runs || [])][0];
  if (running) return { runId: String(running.id), alreadyRunning: true };

  const since = Date.now() - 5000;
  const dispatched = await gh(`${workflowPath(env)}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: env.GITHUB_BRANCH || 'main', return_run_details: true }),
  });
  if (dispatched?.workflow_run_id) return { runId: String(dispatched.workflow_run_id), alreadyRunning: false };

  // Older API behaviour answers 204 with no body: find the run it created.
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    const data = await gh(`${workflowPath(env)}/runs?per_page=5&event=workflow_dispatch`);
    const run = (data.workflow_runs || []).find((r) => Date.parse(r.created_at) >= since);
    if (run) return { runId: String(run.id), alreadyRunning: false };
  }
  throw new Error('The run was started, but GitHub has not listed it yet. Refresh in a few seconds.');
}

// ---- Helpers ----

function renderPage(env) {
  const config = {
    repoUrl: `https://github.com/${env.GITHUB_REPO}`,
    actionsUrl: `https://github.com/${env.GITHUB_REPO}/actions/runs/`,
    reportBase: pagesBase(env),
    siteUrl: env.TARGET_SITE || 'opensource-demo.orangehrmlive.com',
  };
  return PAGE.replace('/*__CONFIG__*/{}', JSON.stringify(config));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
