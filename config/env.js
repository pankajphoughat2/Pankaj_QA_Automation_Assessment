const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

/**
 * Central place for environment-specific settings.
 * Every value can be overridden through a `.env` file or process environment variables.
 */
module.exports = {
  baseUrl: process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com',
  username: process.env.HRM_USERNAME || 'Admin',
  password: process.env.HRM_PASSWORD || 'admin123',
  headless: process.env.HEADLESS !== 'false',
};
