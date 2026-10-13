import { expect, test } from '@playwright/test';

import { cartBadge, gotoApp } from './helpers';

test.describe('Menu', () => {
  test('redirects the home page to the menu', async ({ page }) => {
    await gotoApp(page, '/');
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole('heading', { name: 'Our Menu' })).toBeVisible();
  });

  test('lists products from the API', async ({ page }) => {
    await gotoApp(page, '/menu');
    await expect(page.locator('.product-card').first()).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('filters products by category', async ({ page }) => {
    await gotoApp(page, '/menu');
    const filters = page.getByRole('group', { name: 'Filter by category' }).getByRole('button');
    const cards = page.locator('.product-card');
    const allCount = await cards.count();

    // The first button is "All"; pick the first real category.
    const category = filters.nth(1);
    const categoryName = (await category.innerText()).trim();
    await category.click();

    await expect(category).toHaveClass(/btn-primary/);
    for (const badge of await cards.locator('.badge').all()) {
      await expect(badge).toHaveText(categoryName);
    }

    await filters.first().click();
    await expect(cards).toHaveCount(allCount);
  });

  test('adding a product updates the cart badge', async ({ page }) => {
    await gotoApp(page, '/menu');
    const addButton = page.locator('.product-card').first().getByRole('button', { name: /Add/ });

    await expect(cartBadge(page)).toHaveCount(0);
    await addButton.click();
    await addButton.click();

    await expect(cartBadge(page)).toHaveText('2');
    await expect(addButton.locator('.badge')).toHaveText('2');
  });
});
