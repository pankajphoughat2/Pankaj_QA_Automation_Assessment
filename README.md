# OrangeHRM – Employee Lifecycle Automation (Playwright + JMeter)

**Author:** Pankaj

End-to-end **UI + API automation** and **performance testing** of the **Employee Lifecycle Management**
scenario on the [OrangeHRM open-source demo](https://opensource-demo.orangehrmlive.com/):

- **Functional automation:** Playwright Test with JavaScript and the Page Object Model
- **Performance testing:** Apache JMeter 5.6.3

## Scenario covered

| # | Step | What is verified |
|---|------|------------------|
| 1 | **Login** as `Admin / admin123` | Dashboard URL, "Dashboard" header, widgets and user menu are visible |
| 2 | **Add employee** (PIM > Add Employee) with First Name, Last Name, Employee ID and profile picture, read from `test-data/employees.json` | "Successfully Saved" toast, the Personal Details page shows the saved values, the uploaded photo is displayed, and the record appears in the Employee List |
| 3 | **Edit employee**: search by Employee ID, then update Job Title and Employment Status | "Successfully Updated" toast; the values are still there after a page reload and show in the Employee List grid |
| 4 | **Validate via API** (OrangeHRM REST API v2) | `GET /pim/employees`, `/personal-details` and `/job-details` return the created and updated data; **the UI grid row matches the API data field for field** (attached to the report as `ui-vs-api.json`) |
| 5 | **Delete employee** from the UI | "Successfully Deleted" toast, the UI search shows "No Records Found", the API search no longer returns the employee, and fetching it by `empNumber` fails |
| 6 | **Logout** | Redirected to the login page; opening a protected page sends you back to login; an API call with the old session returns **401** |

Each step is a `test.step(...)`, so the HTML report shows the flow step by step.

## Tech stack / dependencies

| Tool / package | Purpose |
|---------|---------|
| [`@playwright/test`](https://playwright.dev) | Browser automation, test runner, assertions, HTML reporter, video recording |
| [`dotenv`](https://github.com/motdotla/dotenv) | Optional `.env` overrides (URL, credentials, headless) |
| `@types/node` | Editor IntelliSense |
| [Apache JMeter 5.6.3](https://jmeter.apache.org/) | Performance testing (needs Java 8+; uses only core JMeter elements, no plugins) |

Requirements: **Node.js 18+** (developed on Node 24) and npm. JMeter and Java are needed only for the performance test.

## Framework structure

```
OrangeMantra_Pankaj/
├── api/
│   └── EmployeeApiClient.js      # OrangeHRM REST API v2 wrapper (shares the UI session cookie)
├── config/
│   └── env.js                    # Base URL, credentials, headless flag (.env overridable)
├── fixtures/
│   └── testFixtures.js           # test.extend(): injects page objects + API client into tests
├── pages/                        # Page Object Model
│   ├── BasePage.js               # Shared helpers: loaders, toasts, label-based inputs/dropdowns, logout
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── AddEmployeePage.js
│   ├── PersonalDetailsPage.js
│   ├── JobDetailsPage.js
│   └── EmployeeListPage.js
├── performance/                  # JMeter performance test
│   ├── Pankaj_Employee_Lifecycle.jmx
│   └── data/
│       ├── Pankaj_employees.csv          # Data-driven employees for JMeter
│       └── profile-picture.base64.txt    # Profile picture encoded for the JSON upload
├── scripts/
│   └── archive-artifacts.js      # Copies the latest Playwright report + video into reports/
├── test-data/
│   ├── employees.json            # Data-driven input (one test is generated per record)
│   └── files/profile-picture.png # Profile picture to upload
├── tests/
│   └── employee-lifecycle.spec.js
├── reports/                      # Committed evidence of the latest runs
│   ├── Pankaj_Playwright_HTML_Report/index.html
│   ├── Pankaj_Playwright_Videos/Pankaj_Employee_Lifecycle_Test_Run.webm
│   └── performance/Pankaj_JMeter_HTML_Report/index.html
├── playwright.config.js
├── package.json
├── .env.example
└── README.md
```

### Design notes

- **POM + fixtures:** specs call only business-level methods such as `addEmployee()`, `updateJob()` and `deleteEmployee()`. Locators live in the page classes. Page objects are provided through Playwright fixtures, so tests don't create them by hand.
- **Label-based locators:** OrangeHRM uses custom widgets with no stable ids. `BasePage.inputGroup(label)` finds a field by its visible label, and `selectDropdownOption()` handles the custom `oxd-select`.
- **Data-driven:** add another object to `test-data/employees.json` and a new test is generated for it. The Employee ID is made unique for each run (prefix + timestamp, max 10 chars), so reruns on the shared demo site never collide.
- **API validation:** the API client uses `page.request`, which shares the browser's authenticated cookie. The API is therefore called exactly as the OrangeHRM front-end calls it, with no separate token setup.
- **Descriptive assertions:** every `expect` has a message, so a failure explains what went wrong.
- **Reliability:** it waits for OrangeHRM's loaders to disappear and uses web-first assertions, with no hard `waitForTimeout` sleeps.

## Setup

```bash
git clone <this-repo-url>
cd OrangeMantra_Pankaj
npm install
npx playwright install chromium
```

Optional: copy `.env.example` to `.env` to override the URL, credentials or headless mode.

## Running the Playwright tests

```bash
npm test                  # headless run + archives the report/video into reports/
npm run test:headed       # watch the browser
npm run test:debug        # step through with the Playwright Inspector
npm run report            # open the latest HTML report
npm run archive           # archive report/video manually (e.g. after a failed run)
```

Or run Playwright directly: `npx playwright test --grep @e2e`.

## Playwright reports & video

- **HTML report:** `reports/Pankaj_Playwright_HTML_Report/index.html`. Open it with
  `npx playwright show-report reports/Pankaj_Playwright_HTML_Report`. It contains every step, the final screenshot,
  the embedded video and the `ui-vs-api.json` comparison.
- **Video:** `reports/Pankaj_Playwright_Videos/Pankaj_Employee_Lifecycle_Test_Run.webm`. Every run is recorded
  (`video: 'on'` in `playwright.config.js`).
- **Trace:** kept for failed runs (`trace: 'retain-on-failure'`). Open it with `npx playwright show-trace <trace.zip>`.

## Performance testing (JMeter)

`performance/Pankaj_Employee_Lifecycle.jmx` runs the same 6-step lifecycle at the HTTP/API level.

| Transaction | Requests | Assertions |
|---|---|---|
| `01_Login` | GET login page (extract CSRF token) → POST credentials | HTTP 200; redirected to `/dashboard/index` |
| `02_Add_Employee` | POST employee with Base64 profile picture → GET picture | Employee ID saved; picture type is `image/png`; `empNumber` extracted |
| `03_Edit_Employee` | Search by Employee ID → look up job title/status IDs by name → PUT job details | Exactly 1 match; updated Job Title & Employment Status returned |
| `04_Validate_Employee_API` | GET personal details → GET job details | First/last name, Employee ID, job title, status all match |
| `05_Delete_Employee` | DELETE → search again → GET deleted employee | Search total = 0; lookup returns **422** |
| `06_Logout` | GET logout → call API with the old session | Redirected to `/auth/login`; API returns **401** |

**Design:**
- Each business step is a **Transaction Controller**, so the report shows timings per step.
- The Cookie Manager gives each virtual user its own session.
- Test data comes from a CSV Data Set: `performance/data/Pankaj_employees.csv`.
- Unique Employee IDs come from `__RandomString`.
- A Duration Assertion applies a response-time SLA (`slaMs`, default 5000 ms).
- Uniform random think time is added between requests.
- Only core JMeter elements are used, with no Groovy and no plugins, so the script runs on any Java version, including Java 21+.
- File paths are relative to the `.jmx`, so the project works from any clone location.
- The thread group is fixed at **1 user, 1 loop**.
- Host, credentials, SLA and data paths are Test Plan variables (`${__P(name,default)}`). You can override them with `-J<name>=<value>`.

**Run in the JMeter GUI:** open `performance/Pankaj_Employee_Lifecycle.jmx`, then press **Start**. To see each request, enable *View Results Tree*.

**Run from the command line and generate the HTML dashboard:**

```bash
jmeter -n -t performance/Pankaj_Employee_Lifecycle.jmx -l reports/performance/Pankaj_JMeter_Results.jtl -e -o reports/performance/Pankaj_JMeter_HTML_Report
```

Then open `reports/performance/Pankaj_JMeter_HTML_Report/index.html`. The `-o` folder must be empty or must not exist yet.

> The target is a shared public demo, so keep the load light.

> Note: the OrangeHRM demo is a shared public instance that is reset from time to time. If the Job Title or
> Employment Status in `employees.json` / `Pankaj_employees.csv` is ever removed from the demo, change them to any
> value listed under *Admin > Job*.
