const { test, expect } = require('../fixtures/testFixtures');
const env = require('../config/env');
const { loadJson, buildEmployee } = require('../utils/dataHelper');

const employees = loadJson('employees.json');

test.describe('Employee Lifecycle Management', () => {
  for (const record of employees) {
    test(`${record.testCase} @e2e`, async ({
      page,
      loginPage,
      dashboardPage,
      addEmployeePage,
      personalDetailsPage,
      jobDetailsPage,
      employeeListPage,
      employeeApi,
    }, testInfo) => {
      const employee = buildEmployee(record);
      let empNumber;
      testInfo.annotations.push({ type: 'Employee Id', description: employee.employeeId });

      await test.step('1. Login with valid credentials and verify dashboard', async () => {
        await loginPage.open();
        await loginPage.login(env.username, env.password);
        await dashboardPage.expectLoaded();
      });

      await test.step('2. Add a new employee with profile picture (data-driven)', async () => {
        await dashboardPage.openMenu('PIM');
        await addEmployeePage.open();
        await addEmployeePage.addEmployee(employee);
        await addEmployeePage.expectToast('Successfully Saved');

        await personalDetailsPage.expectLoaded();
        empNumber = personalDetailsPage.empNumber();
        await personalDetailsPage.expectEmployeeDetails(employee);
        await personalDetailsPage.expectProfilePictureUploaded();

        // Record presence in the Employee List
        await employeeListPage.open();
        await employeeListPage.searchByEmployeeId(employee.employeeId);
        await employeeListPage.expectSingleResult(employee.employeeId);
      });

      await test.step('3. Search employee by ID and update Job Title & Employment Status', async () => {
        await employeeListPage.openEmployee(employee.employeeId);
        await personalDetailsPage.expectLoaded();
        await personalDetailsPage.openJobTab();

        await jobDetailsPage.expectLoaded();
        await jobDetailsPage.updateJob(employee.update);
        await jobDetailsPage.expectToast('Successfully Updated');

        // Reload to prove the change is persisted, not just held in the form
        await page.reload();
        await jobDetailsPage.expectLoaded();
        await jobDetailsPage.expectJob(employee.update);

        // Changes reflected in the Employee List grid as well
        await employeeListPage.open();
        await employeeListPage.searchByEmployeeId(employee.employeeId);
        const row = await employeeListPage.readRow(employee.employeeId);
        expect(row.jobTitle, 'Employee List should show the updated Job Title').toBe(employee.update.jobTitle);
        expect(row.employmentStatus, 'Employee List should show the updated Employment Status').toBe(
          employee.update.employmentStatus,
        );
      });

      await test.step('4. Validate employee via API and cross-check with UI', async () => {
        const uiRow = await employeeListPage.readRow(employee.employeeId);

        const matches = await employeeApi.findByEmployeeId(employee.employeeId);
        expect(matches, 'API search should return exactly one employee for the Employee Id').toHaveLength(1);
        const apiEmployee = matches[0];
        expect(apiEmployee.empNumber, 'API empNumber should match the one in the UI URL').toBe(empNumber);

        const personal = await employeeApi.getPersonalDetails(empNumber);
        expect(personal.status, 'Personal details API should respond with 200').toBe(200);
        expect(personal.body.data, 'API personal details should match the created employee').toMatchObject({
          empNumber,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
        });

        const job = await employeeApi.getJobDetails(empNumber);
        expect(job.status, 'Job details API should respond with 200').toBe(200);
        expect(job.body.data.jobTitle.title, 'API Job Title should reflect the update').toBe(
          employee.update.jobTitle,
        );
        expect(job.body.data.empStatus.name, 'API Employment Status should reflect the update').toBe(
          employee.update.employmentStatus,
        );

        // UI <-> API consistency
        const apiView = {
          employeeId: personal.body.data.employeeId,
          firstAndMiddleName: [personal.body.data.firstName, personal.body.data.middleName].filter(Boolean).join(' '),
          lastName: personal.body.data.lastName,
          jobTitle: job.body.data.jobTitle.title,
          employmentStatus: job.body.data.empStatus.name,
        };
        await testInfo.attach('ui-vs-api.json', {
          body: JSON.stringify({ ui: uiRow, api: apiView }, null, 2),
          contentType: 'application/json',
        });
        expect(uiRow, 'Employee data shown in the UI should match the API data').toEqual(apiView);
      });

      await test.step('5. Delete the employee and verify via UI and API', async () => {
        await employeeListPage.deleteEmployee(employee.employeeId);
        await employeeListPage.expectToast('Successfully Deleted');

        await employeeListPage.open();
        await employeeListPage.searchByEmployeeId(employee.employeeId);
        await employeeListPage.expectNoResults();

        const matches = await employeeApi.findByEmployeeId(employee.employeeId);
        expect(matches, 'API search should no longer return the deleted employee').toHaveLength(0);

        const personal = await employeeApi.getPersonalDetails(empNumber);
        expect(personal.status, 'Fetching a deleted employee by empNumber should fail').not.toBe(200);
      });

      await test.step('6. Logout and verify the session is invalidated', async () => {
        await dashboardPage.logout();
        await loginPage.expectOnLoginPage();

        // Protected page must redirect back to login
        await page.goto('/web/index.php/pim/viewEmployeeList');
        await loginPage.expectOnLoginPage();

        // API calls with the old session cookie must be rejected
        const afterLogout = await employeeApi.searchEmployees(employee.employeeId);
        expect(afterLogout.status, 'API should reject requests after logout (401 Unauthorized)').toBe(401);
      });
    });
  }
});
