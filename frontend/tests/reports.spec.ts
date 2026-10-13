import { APIRequestContext, expect, test } from '@playwright/test';

import { API_URL, STAFF, createOrderViaApi, gotoApp, loginAs, uniqueName } from './helpers';

async function adminToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, { data: STAFF.admin });
  return (await response.json()).token;
}

async function setStatus(request: APIRequestContext, token: string, orderId: number, status: string) {
  const response = await request.put(`${API_URL}/orders/${orderId}/status`, {
    data: JSON.stringify(status),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Sales reports', () => {
  test('counts completed and cancelled orders for today', async ({ page, request }) => {
    const token = await adminToken(request);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const before = await (await request.get(`${API_URL}/orders/report?timeZone=${timeZone}`, {
      headers: { Authorization: `Bearer ${token}` }
    })).json();

    // Other tests run in parallel and may finish orders too, so check for at least these.
    const completed = await createOrderViaApi(request, uniqueName('Report done'));
    await setStatus(request, token, completed.id, 'Completed');
    const cancelled = await createOrderViaApi(request, uniqueName('Report cancelled'));
    await setStatus(request, token, cancelled.id, 'Cancelled');

    await loginAs(page, request, 'admin');
    await gotoApp(page, '/admin/reports');

    await expect(page.getByRole('button', { name: 'Today' })).toHaveClass(/btn-primary/);
    const completedCount = Number(await page.getByTestId('completed-orders').innerText());
    const cancelledCount = Number(await page.getByTestId('cancelled-orders').innerText());
    expect(completedCount).toBeGreaterThanOrEqual(before.completedOrders + 1);
    expect(cancelledCount).toBeGreaterThanOrEqual(before.cancelledOrders + 1);
    await expect(page.getByRole('heading', { name: 'Products sold' })).toBeVisible();
    // A single day has no per-day table.
    await expect(page.getByRole('heading', { name: 'Per day' })).toHaveCount(0);
  });

  test('filters by month and custom range', async ({ page, request }) => {
    await loginAs(page, request, 'admin');
    await gotoApp(page, '/admin/reports');

    await page.getByRole('button', { name: 'This month' }).click();
    await expect(page.getByRole('heading', { name: 'Per day' })).toBeVisible();

    await page.getByLabel('Month').fill('2026-02');
    await page.getByLabel('Month').dispatchEvent('change');
    await expect(page.getByRole('button', { name: 'This month' })).toHaveClass(/btn-outline-secondary/);
    // February 2026 has 28 days: one row each.
    await expect(page.locator('table:has(tfoot) tbody tr')).toHaveCount(28);

    await page.getByLabel('From').fill('2026-03-10');
    await page.getByLabel('To').fill('2026-03-01');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByRole('alert')).toHaveText('The end date must be on or after the start date.');

    await page.getByLabel('To').fill('2026-03-12');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.locator('table:has(tfoot) tbody tr')).toHaveCount(3);
  });

  test('cashiers cannot open the reports page', async ({ page, request }) => {
    await loginAs(page, request, 'cashier');
    await gotoApp(page, '/admin/reports');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fadmin%2Freports/);
  });
});
