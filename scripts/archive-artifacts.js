/**
 * Copies the latest Playwright HTML report and test-run videos into `reports/`
 * so they can be committed to the repository as execution evidence.
 * Runs automatically after `npm test` (see "posttest" in package.json).
 */
const fs = require('fs');
const path = require('path');

const AUTHOR = 'Pankaj';

const root = path.resolve(__dirname, '..');
const reportSrc = path.join(root, 'playwright-report');
const resultsSrc = path.join(root, 'test-results');
const reportsDir = path.join(root, 'reports');
const htmlDest = path.join(reportsDir, `${AUTHOR}_Playwright_HTML_Report`);
const videoDest = path.join(reportsDir, `${AUTHOR}_Playwright_Videos`);

if (!fs.existsSync(reportSrc)) {
  console.error('No playwright-report found. Run the tests first.');
  process.exit(1);
}

fs.rmSync(htmlDest, { recursive: true, force: true });
fs.rmSync(videoDest, { recursive: true, force: true });
fs.mkdirSync(videoDest, { recursive: true });
fs.cpSync(reportSrc, htmlDest, { recursive: true });

const videos = fs.existsSync(resultsSrc)
  ? fs
      .readdirSync(resultsSrc, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
      .map((dir) => path.join(resultsSrc, dir.name, 'video.webm'))
      .filter((video) => fs.existsSync(video))
  : [];

videos.forEach((video, i) => {
  const suffix = videos.length > 1 ? `_${i + 1}` : '';
  fs.copyFileSync(video, path.join(videoDest, `${AUTHOR}_Employee_Lifecycle_Test_Run${suffix}.webm`));
});

console.log(
  `Archived HTML report -> ${path.relative(root, htmlDest)}, ${videos.length} video(s) -> ${path.relative(root, videoDest)}`,
);
