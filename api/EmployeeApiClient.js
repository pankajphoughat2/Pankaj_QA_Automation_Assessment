const { expect } = require('@playwright/test');

const API_BASE = '/web/index.php/api/v2';

/**
 * Thin wrapper around the OrangeHRM REST API (v2).
 *
 * It uses the browser context's `APIRequestContext`, so requests are authenticated
 * with the same session cookie as the UI – exactly what the front-end itself does.
 */
class EmployeeApiClient {
  /** @param {import('@playwright/test').APIRequestContext} request */
  constructor(request) {
    this.request = request;
  }

  async #getJson(url) {
    const response = await this.request.get(`${API_BASE}${url}`, { failOnStatusCode: false });
    let body = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON response (e.g. HTML redirect after logout)
    }
    return { status: response.status(), body };
  }

  /** GET /pim/employees?nameOrId=... – search employees (current employees only). */
  async searchEmployees(nameOrId) {
    return this.#getJson(`/pim/employees?nameOrId=${encodeURIComponent(nameOrId)}&includeEmployees=onlyCurrent`);
  }

  /** GET /pim/employees/{empNumber}/personal-details */
  async getPersonalDetails(empNumber) {
    return this.#getJson(`/pim/employees/${empNumber}/personal-details`);
  }

  /** GET /pim/employees/{empNumber}/job-details */
  async getJobDetails(empNumber) {
    return this.#getJson(`/pim/employees/${empNumber}/job-details`);
  }

  /**
   * Finds exactly one employee by Employee ID and returns the API record.
   * Search is a "contains" match, so results are filtered on the exact ID.
   */
  async findByEmployeeId(employeeId) {
    const { status, body } = await this.searchEmployees(employeeId);
    expect(status, 'Employee search API should respond with 200').toBe(200);
    return body.data.filter((e) => e.employeeId === employeeId);
  }
}

module.exports = { EmployeeApiClient, API_BASE };
