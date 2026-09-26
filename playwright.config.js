// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const env = require('./config/env');

/**
 * Playwright configuration for the OrangeHRM Employee Lifecycle suite.
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  // The OrangeHRM public demo is shared and slow, so allow generous timeouts.
  timeout: 5 * 60 * 1000,
  expect: { timeout: 20 * 1000 },

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20 * 1000,
    navigationTimeout: 60 * 1000,

    // Evidence collected for every run (embedded in the HTML report).
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
