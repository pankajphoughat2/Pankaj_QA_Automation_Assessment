const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class AddEmployeePage extends BasePage {
  constructor(page) {
    super(page);
    this.addEmployeeTab = page.getByRole('link', { name: 'Add Employee' });
    this.header = page.getByRole('heading', { name: 'Add Employee' });
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.employeeIdInput = this.inputByLabel('Employee Id');
    this.profilePictureInput = page.locator('input[type="file"]');
    this.profilePicturePreview = page.locator('.employee-image');
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  /** Opens PIM > Add Employee from within the PIM module. */
  async open() {
    await this.addEmployeeTab.click();
    await expect(this.header, 'Add Employee form should be displayed').toBeVisible();
    await this.waitForLoaders();
  }

  /**
   * Fills and submits the Add Employee form.
   * @param {{firstName:string,lastName:string,employeeId:string,profilePicturePath:string}} employee
   */
  async addEmployee(employee) {
    await this.firstNameInput.fill(employee.firstName);
    await this.lastNameInput.fill(employee.lastName);
    await this.employeeIdInput.fill(employee.employeeId);
    await this.profilePictureInput.setInputFiles(employee.profilePicturePath);
    await expect(
      this.profilePicturePreview,
      'Uploaded profile picture should be previewed as a data URL',
    ).toHaveAttribute('src', /^data:image\//);
    await this.saveButton.click();
  }
}

module.exports = { AddEmployeePage };
