const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

/** Employee profile (Personal Details tab) shown after an employee is created or opened. */
class PersonalDetailsPage extends BasePage {
  constructor(page) {
    super(page);
    this.header = page.getByRole('heading', { name: 'Personal Details' });
    this.employeeName = page.locator('.orangehrm-edit-employee-name h6');
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.employeeIdInput = this.inputByLabel('Employee Id');
    this.profilePicture = page.locator('.orangehrm-edit-employee-image img.employee-image');
    this.jobTab = page.locator('.orangehrm-tabs').getByRole('link', { name: 'Job' });
  }

  async expectLoaded() {
    await expect(this.page, 'Should land on the employee Personal Details page').toHaveURL(
      /\/pim\/viewPersonalDetails\/empNumber\/\d+/,
    );
    await expect(this.header, 'Personal Details heading should be visible').toBeVisible();
    await this.waitForLoaders();
  }

  /** Employee number (internal DB id) extracted from the current URL. */
  empNumber() {
    const match = this.page.url().match(/empNumber\/(\d+)/);
    expect(match, `empNumber should be present in URL ${this.page.url()}`).not.toBeNull();
    return Number(match[1]);
  }

  async expectEmployeeDetails({ firstName, lastName, employeeId }) {
    await expect(this.employeeName, 'Profile header should show the employee full name').toHaveText(
      `${firstName} ${lastName}`,
    );
    await expect(this.firstNameInput, 'First Name should be saved').toHaveValue(firstName);
    await expect(this.lastNameInput, 'Last Name should be saved').toHaveValue(lastName);
    await expect(this.employeeIdInput, 'Employee Id should be saved').toHaveValue(employeeId);
  }

  /** Verifies that an uploaded (non-default) profile photo is rendered. */
  async expectProfilePictureUploaded() {
    await expect(this.profilePicture, 'Profile picture should be served from the employee photo endpoint').toHaveAttribute(
      'src',
      /viewPhoto\/empNumber\/\d+/,
    );
    await expect
      .poll(
        () => this.profilePicture.evaluate((img) => img.complete && img.naturalWidth),
        { message: 'Uploaded profile picture should be rendered' },
      )
      .toBeGreaterThan(0);
  }

  async openJobTab() {
    await this.jobTab.click();
  }
}

module.exports = { PersonalDetailsPage };
