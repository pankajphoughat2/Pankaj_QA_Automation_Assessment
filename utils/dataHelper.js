const fs = require('fs');
const path = require('path');

const TEST_DATA_DIR = path.resolve(__dirname, '..', 'test-data');

/**
 * Loads a JSON file from the test-data folder.
 * @param {string} fileName e.g. "employees.json"
 */
function loadJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, fileName), 'utf-8'));
}

/** Absolute path of a file stored inside the test-data folder. */
function testDataPath(relativePath) {
  return path.join(TEST_DATA_DIR, relativePath);
}

/**
 * Builds a unique Employee ID (OrangeHRM allows max 10 chars) so that repeated
 * runs on the shared demo instance never collide with existing records.
 */
function uniqueEmployeeId(prefix = 'QA') {
  const suffix = `${Date.now()}`.slice(-(10 - prefix.length));
  return `${prefix}${suffix}`;
}

/**
 * Turns a raw JSON record into a fully-resolved employee object for a test run.
 */
function buildEmployee(record) {
  return {
    ...record,
    employeeId: uniqueEmployeeId(record.employeeIdPrefix),
    profilePicturePath: testDataPath(record.profilePicture),
  };
}

module.exports = { loadJson, testDataPath, uniqueEmployeeId, buildEmployee };
