const { expect } = require('@playwright/test');

/**
 * Common behaviour shared by every OrangeHRM page: loaders, toasts,
 * OrangeHRM custom widgets (inputs/selects located by their label) and the user menu.
 */
class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.formLoader = page.locator('.oxd-form-loader');
    this.pageLoader = page.locator('.oxd-loading-spinner');
    this.toast = page.locator('.oxd-toast');
    this.breadcrumb = page.locator('.oxd-topbar-header-breadcrumb');
    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
  }

  /** Waits until OrangeHRM finished its async loading overlays. */
  async waitForLoaders() {
    await expect(this.formLoader, 'Form loader should disappear').toHaveCount(0);
    await expect(this.pageLoader, 'Loading spinner should disappear').toHaveCount(0);
  }

  /** Input group (label + field) located by its visible label text. */
  inputGroup(label) {
    return this.page.locator('.oxd-input-group').filter({
      has: this.page.locator('label', { hasText: new RegExp(`^${label}$`) }),
    });
  }

  /** Text input located by its label. */
  inputByLabel(label) {
    return this.inputGroup(label).locator('input');
  }

  /**
   * Picks an option from an OrangeHRM custom <oxd-select> dropdown.
   * @param {string} label   Label shown above the dropdown
   * @param {string} option  Exact option text
   */
  async selectDropdownOption(label, option) {
    await this.inputGroup(label).locator('.oxd-select-text').click();
    const listbox = this.page.getByRole('listbox');
    await expect(listbox, `Dropdown "${label}" should open`).toBeVisible();
    await listbox.getByRole('option', { name: option, exact: true }).click();
    await expect(
      this.selectedDropdownValue(label),
      `Dropdown "${label}" should show "${option}" after selection`,
    ).toHaveText(option);
  }

  /** Current text shown in a custom dropdown. */
  selectedDropdownValue(label) {
    return this.inputGroup(label).locator('.oxd-select-text-input');
  }

  /** Asserts that a toast with the given message is shown. */
  async expectToast(message) {
    await expect(
      this.toast.filter({ hasText: message }),
      `Toast message "${message}" should be displayed`,
    ).toBeVisible();
  }

  async logout() {
    await this.userDropdown.click();
    await this.logoutMenuItem.click();
  }
}

module.exports = { BasePage };
