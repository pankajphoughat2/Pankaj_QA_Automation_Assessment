const base = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { AddEmployeePage } = require('../pages/AddEmployeePage');
const { PersonalDetailsPage } = require('../pages/PersonalDetailsPage');
const { JobDetailsPage } = require('../pages/JobDetailsPage');
const { EmployeeListPage } = require('../pages/EmployeeListPage');
const { EmployeeApiClient } = require('../api/EmployeeApiClient');

/**
 * Extends Playwright's `test` with ready-to-use page objects and the API client,
 * so specs stay focused on the business flow.
 */
const test = base.test.extend({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  addEmployeePage: async ({ page }, use) => use(new AddEmployeePage(page)),
  personalDetailsPage: async ({ page }, use) => use(new PersonalDetailsPage(page)),
  jobDetailsPage: async ({ page }, use) => use(new JobDetailsPage(page)),
  employeeListPage: async ({ page }, use) => use(new EmployeeListPage(page)),
  // page.request shares cookies with the browser context => same authenticated session as the UI
  employeeApi: async ({ page }, use) => use(new EmployeeApiClient(page.request)),
});

module.exports = { test, expect: base.expect };
