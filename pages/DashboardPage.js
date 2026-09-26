const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class DashboardPage extends BasePage {
  static URL = '/web/index.php/dashboard/index';

  constructor(page) {
    super(page);
    this.dashboardGrid = page.locator('.orangehrm-dashboard-grid');
    this.sideMenu = page.locator('.oxd-sidepanel');
  }

  async expectLoaded() {
    await expect(this.page, 'URL should point to the dashboard after login').toHaveURL(/\/dashboard\/index/);
    await expect(this.breadcrumb, 'Header should display "Dashboard"').toHaveText('Dashboard');
    await expect(this.dashboardGrid, 'Dashboard widgets should be visible').toBeVisible();
    await expect(this.userDropdown, 'Logged-in user menu should be visible').toBeVisible();
  }

  /** Navigates through the side menu, e.g. openMenu('PIM'). */
  async openMenu(name) {
    await this.sideMenu.getByRole('link', { name, exact: true }).click();
  }
}

module.exports = { DashboardPage };
