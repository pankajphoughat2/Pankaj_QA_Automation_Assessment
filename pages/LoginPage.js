const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  static URL = '/web/index.php/auth/login';

  constructor(page) {
    super(page);
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.loginTitle = page.getByRole('heading', { name: 'Login' });
  }

  async open() {
    await this.page.goto(LoginPage.URL);
    await expect(this.usernameInput, 'Username field should be visible on the login page').toBeVisible();
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectOnLoginPage() {
    await expect(this.page, 'User should be redirected to the login page').toHaveURL(/\/auth\/login/);
    await expect(this.loginTitle, 'Login form heading should be visible').toBeVisible();
    await expect(this.usernameInput, 'Username field should be visible').toBeVisible();
  }
}

module.exports = { LoginPage };
