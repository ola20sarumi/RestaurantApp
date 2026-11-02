import { defineConfig, devices } from '@playwright/test';

/**
 * The API under test uses its own database, never the development one: the tests create real orders.
 * Defaults to RestaurantDb_E2E on the local SQL Server; set E2E_CONNECTION_STRING to use another server.
 */
const testConnectionString = process.env['E2E_CONNECTION_STRING']
  ?? 'Server=localhost;Database=RestaurantDb_E2E;Trusted_Connection=True;TrustServerCertificate=True;';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /* Opt out of parallel tests on CI; locally, more workers overload the dev SSR server. */
  workers: process.env['CI'] ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:4200/',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    //{
      //name: 'firefox',
      //use: { ...devices['Desktop Firefox'] },
    //},

    //{
      //name: 'webkit',
      //use: { ...devices['Desktop Safari'] },
    //},

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Start the API (always, on the test database) and the Angular dev server (or reuse one already running locally). */
  webServer: [
    {
      // Stands in for Paystack (see tests/fake-paystack.mjs).
      command: 'node tests/fake-paystack.mjs',
      url: 'http://localhost:5055/health',
      reuseExistingServer: !process.env['CI'],
    },
    {
      // Builds the API, creates or updates the test database (migrations + seed menu and staff logins), then starts
      // the API on it.
      command: 'dotnet build ../backend && dotnet ef database update --project ../backend --no-build'
        + ' && dotnet run --project ../backend --no-build',
      url: 'http://localhost:5044/api/categories',
      // Never reuse an API that is already running: it would be connected to the development database.
      // Stop your own API before running the tests.
      reuseExistingServer: false,
      timeout: 180 * 1000,
      // Point the API at the test database and the fake Paystack.
      env: {
        ConnectionStrings__DefaultConnection: testConnectionString,
        Paystack__BaseUrl: 'http://localhost:5055/',
        Paystack__SecretKey: 'sk_test_fake_for_e2e',
      },
    },
    {
      command: 'npm start',
      url: 'http://localhost:4200/',
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
    },
  ],
});
