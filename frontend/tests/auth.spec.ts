import { expect, test } from '@playwright/test';

import { API_URL, STAFF, gotoApp, loginAs } from './helpers';

test.describe('Staff login', () => {
  test('sends signed-out visitors to the login page and back after signing in', async ({ page }) => {
    await gotoApp(page, '/cashier');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcashier/);

    await page.getByLabel('Username').fill(STAFF.cashier.username);
    await page.getByLabel('Password').fill(STAFF.cashier.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/cashier$/);
    await expect(page.getByLabel('Filter by status')).toBeVisible();
  });

  test('shows an error for a wrong password', async ({ page }) => {
    await gotoApp(page, '/login');
    await page.getByLabel('Username').fill(STAFF.admin.username);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toHaveText('Incorrect username or password.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('admin lands on the menu admin page and can sign out', async ({ page }) => {
    await gotoApp(page, '/login');
    await page.getByLabel('Username').fill(STAFF.admin.username);
    await page.getByLabel('Password').fill(STAFF.admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await gotoApp(page, '/admin');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fadmin/);
  });

  test('cashiers cannot open the admin page', async ({ page, request }) => {
    await loginAs(page, request, 'cashier');
    await gotoApp(page, '/admin');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fadmin/);
    await expect(page.getByRole('alert')).toContainText("You're signed in as cashier");
    await expect(page.locator('nav').getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });

  test('the API rejects staff calls without a token', async ({ request }) => {
    expect((await request.get(`${API_URL}/orders`)).status()).toBe(401);
    expect((await request.post(`${API_URL}/categories`, { data: { name: 'Nope' } })).status()).toBe(401);
  });
});
