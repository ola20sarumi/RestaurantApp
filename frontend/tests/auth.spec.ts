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

  test('customers see a footer staff link, not navbar staff links', async ({ page }) => {
    await gotoApp(page, '/menu');
    await expect(page.locator('nav').getByRole('link', { name: /staff|admin|cashier/i })).toHaveCount(0);

    await page.locator('footer').getByRole('link', { name: 'Staff login' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('signing out in one tab keeps other tabs signed in', async ({ context }) => {
    const signIn = async (who: keyof typeof STAFF) => {
      const page = await context.newPage();
      await gotoApp(page, '/login');
      await page.getByLabel('Username').fill(STAFF[who].username);
      await page.getByLabel('Password').fill(STAFF[who].password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      return page;
    };
    const adminPage = await signIn('admin');
    await expect(adminPage).toHaveURL(/\/admin$/);
    const cashierPage = await signIn('cashier');
    await expect(cashierPage).toHaveURL(/\/cashier$/);

    await cashierPage.getByRole('button', { name: 'Sign out' }).click();
    await expect(cashierPage).toHaveURL(/\/login$/);

    await adminPage.reload();
    await expect(adminPage).toHaveURL(/\/admin$/);
    await expect(adminPage.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('the API rejects staff calls without a token', async ({ request }) => {
    expect((await request.get(`${API_URL}/orders`)).status()).toBe(401);
    expect((await request.post(`${API_URL}/categories`, { data: { name: 'Nope' } })).status()).toBe(401);
  });
});
