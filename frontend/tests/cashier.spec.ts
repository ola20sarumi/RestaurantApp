import { expect, test } from '@playwright/test';

import { createOnlineOrderViaApi, createOrderViaApi, gotoApp, loginAs, uniqueName } from './helpers';

test.describe('Cashier dashboard', () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAs(page, request, 'cashier');
  });

  test('shows a new order and moves it through the statuses', async ({ page, request }) => {
    const customer = uniqueName('Cashier');
    const order = await createOrderViaApi(request, customer);

    await gotoApp(page, '/cashier');
    const card = page.locator('.card').filter({ has: page.getByText(`#${order.id}`, { exact: true }) });
    const status = card.locator('.card-header .badge');
    await expect(card).toContainText(customer);
    await expect(status).toHaveText('Pending');
    await expect(card.getByRole('button', { name: 'Pending' })).toBeDisabled();

    await card.getByRole('button', { name: 'Preparing' }).click();
    await expect(status).toHaveText('Preparing');

    await card.getByRole('button', { name: 'Ready' }).click();
    await expect(status).toHaveText('Ready');
  });

  test('marks a pay-at-counter order as paid', async ({ page, request }) => {
    const order = await createOrderViaApi(request, uniqueName('Counter pay'));

    await gotoApp(page, '/cashier');
    const card = page.locator('.card').filter({ has: page.getByText(`#${order.id}`, { exact: true }) });
    await expect(card.locator('.payment-badge')).toHaveText('Unpaid · pay at counter');

    await card.getByRole('button', { name: 'Mark as paid' }).click();
    await expect(card.locator('.payment-badge')).toHaveText('Paid at counter');
    await expect(card.getByRole('button', { name: 'Mark as paid' })).toHaveCount(0);
  });

  test('hides online orders until they are paid', async ({ page, request }) => {
    const unpaid = await createOnlineOrderViaApi(request, uniqueName('Unpaid online'));
    const counter = await createOrderViaApi(request, uniqueName('Counter'));

    await gotoApp(page, '/cashier');
    await expect(page.getByText(`#${counter.id}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`#${unpaid.id}`, { exact: true })).toHaveCount(0);
  });

  test('filters orders by status', async ({ page, request }) => {
    const order = await createOrderViaApi(request, uniqueName('Filter'));

    await gotoApp(page, '/cashier');
    const filter = page.getByLabel('Filter by status');
    const card = page.locator('.card').filter({ has: page.getByText(`#${order.id}`, { exact: true }) });

    await filter.selectOption('Pending');
    await expect(card).toBeVisible();
    for (const badge of await page.locator('.card-header .badge.rounded-pill').all()) {
      await expect(badge).toHaveText('Pending');
    }

    await filter.selectOption('Completed');
    await expect(card).toHaveCount(0);
  });
});
