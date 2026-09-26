const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

/** Employee profile > Job tab. */
class JobDetailsPage extends BasePage {
  constructor(page) {
    super(page);
    this.header = page.getByRole('heading', { name: 'Job Details' });
    this.jobDetailsForm = page.locator('form').filter({ has: this.inputGroup('Job Title') });
    this.saveButton = this.jobDetailsForm.getByRole('button', { name: 'Save' });
  }

  async expectLoaded() {
    await expect(this.page, 'Should be on the Job Details page').toHaveURL(/\/pim\/viewJobDetails\/empNumber\/\d+/);
    await expect(this.header, 'Job Details heading should be visible').toBeVisible();
    await this.waitForLoaders();
  }

  async updateJob({ jobTitle, employmentStatus }) {
    await this.selectDropdownOption('Job Title', jobTitle);
    await this.selectDropdownOption('Employment Status', employmentStatus);
    await this.saveButton.click();
  }

  async expectJob({ jobTitle, employmentStatus }) {
    await expect(this.selectedDropdownValue('Job Title'), 'Job Title should be persisted').toHaveText(jobTitle);
    await expect(
      this.selectedDropdownValue('Employment Status'),
      'Employment Status should be persisted',
    ).toHaveText(employmentStatus);
  }
}

module.exports = { JobDetailsPage };
