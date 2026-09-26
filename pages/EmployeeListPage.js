const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

/** PIM > Employee List (search, open and delete employees). */
class EmployeeListPage extends BasePage {
  static URL = '/web/index.php/pim/viewEmployeeList';

  constructor(page) {
    super(page);
    this.employeeListTab = page.getByRole('link', { name: 'Employee List' });
    this.employeeIdFilter = this.inputByLabel('Employee Id');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.tableRows = page.locator('.oxd-table-body .oxd-table-card');
    this.recordsFoundLabel = page.locator('.orangehrm-horizontal-padding span.oxd-text');
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
  }

  async open() {
    await this.page.goto(EmployeeListPage.URL);
    await expect(this.breadcrumb, 'PIM module header should be visible').toContainText('PIM');
    await this.waitForLoaders();
  }

  async searchByEmployeeId(employeeId) {
    await this.employeeIdFilter.fill(employeeId);
    await this.searchButton.click();
    await this.waitForLoaders();
  }

  /** Row whose "Id" column matches the given Employee ID exactly. */
  rowByEmployeeId(employeeId) {
    return this.tableRows.filter({
      has: this.page.locator('.oxd-table-cell').nth(1).filter({ hasText: new RegExp(`^${employeeId}$`) }),
    });
  }

  /**
   * Reads the visible columns of an employee row.
   * Columns: [checkbox, Id, First (& Middle) Name, Last Name, Job Title, Employment Status, Sub Unit, Supervisor, Actions]
   */
  async readRow(employeeId) {
    const cells = this.rowByEmployeeId(employeeId).locator('.oxd-table-cell');
    const text = async (i) => (await cells.nth(i).innerText()).trim();
    return {
      employeeId: await text(1),
      firstAndMiddleName: await text(2),
      lastName: await text(3),
      jobTitle: await text(4),
      employmentStatus: await text(5),
    };
  }

  async expectSingleResult(employeeId) {
    await expect(this.tableRows, `Exactly one employee should match Employee Id "${employeeId}"`).toHaveCount(1);
    await expect(this.rowByEmployeeId(employeeId), 'Result row should belong to the searched employee').toBeVisible();
  }

  async expectNoResults() {
    await expect(this.tableRows, 'No employee rows should be listed').toHaveCount(0);
    await expect(this.recordsFoundLabel, 'Grid should report "No Records Found"').toHaveText('No Records Found');
  }

  async openEmployee(employeeId) {
    await this.rowByEmployeeId(employeeId).click();
  }

  async deleteEmployee(employeeId) {
    await this.rowByEmployeeId(employeeId).locator('button:has(i.bi-trash)').click();
    await expect(this.confirmDeleteButton, 'Delete confirmation dialog should be displayed').toBeVisible();
    await this.confirmDeleteButton.click();
  }
}

module.exports = { EmployeeListPage };
