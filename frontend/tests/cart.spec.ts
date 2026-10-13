import { expect, test } from '@playwright/test';

import { addFirstProductToCart, cartBadge, gotoApp } from './helpers';

test.describe('Cart', () => {
  test('shows an empty state when nothing has been added', async ({ page }) => {
    await gotoApp(page, '/cart');
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
    await page.getByRole('link', { name: 'Browse the menu' }).click();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test('changes quantities and removes items', async ({ page }) => {
    const product = await addFirstProductToCart(page);
    await page.locator('nav a[href="/cart"]').click();
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

    const row = page.locator('.list-group-item', { hasText: product.name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(row.locator('.input-group-text')).toHaveText('2');
    await expect(cartBadge(page)).toHaveText('2');

    await row.getByRole('button', { name: 'Decrease quantity' }).click();
    await expect(row.locator('.input-group-text')).toHaveText('1');

    await row.getByRole('button', { name: `Remove ${product.name}` }).click();
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
    await expect(cartBadge(page)).toHaveCount(0);
  });

  test('keeps the cart after a page reload', async ({ page }) => {
    const product = await addFirstProductToCart(page);
    await gotoApp(page, '/cart');
    await expect(page.locator('.list-group-item', { hasText: product.name })).toBeVisible();
  });
});
