import { defineConfig, devices } from '@playwright/test';

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

  /* Start the API and the Angular dev server before the tests (or reuse ones already running locally). */
  webServer: [
    {
      // Stands in for Paystack (see tests/fake-paystack.mjs).
      command: 'node tests/fake-paystack.mjs',
      url: 'http://localhost:5055/health',
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: 'dotnet run --project ../backend',
      url: 'http://localhost:5044/api/categories',
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
      // Point the API at the fake Paystack. An API you started yourself uses your real (test) keys instead,
      // and the online-payment tests skip themselves.
      env: {
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
