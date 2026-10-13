import { expect, test } from '@playwright/test';

import { addFirstProductToCart, cartBadge, gotoApp, uniqueName } from './helpers';

test.describe('Checkout', () => {
  test('shows an empty state when the cart is empty', async ({ page }) => {
    await gotoApp(page, '/checkout');
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
  });

  test.describe('with an item in the cart', () => {
    test.beforeEach(async ({ page }) => {
      await addFirstProductToCart(page);
      await page.locator('nav a[href="/cart"]').click();
      await page.getByRole('link', { name: 'Go to checkout' }).click();
      await expect(page).toHaveURL(/\/checkout$/);
    });

    test('asks for an order type before submitting', async ({ page }) => {
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();
      await expect(page.getByText("Please choose how you'd like your order.")).toBeVisible();
    });

    test('only shows the fields each order type needs', async ({ page }) => {
      const name = page.getByLabel('Full Name *');
      const phone = page.getByLabel('Phone Number *');
      const address = page.getByLabel('Delivery Address *');

      await page.locator('label[for="type-DineIn"]').click();
      await expect(name).toBeVisible();
      await expect(phone).toHaveCount(0);
      await expect(address).toHaveCount(0);

      await page.locator('label[for="type-Takeout"]').click();
      await expect(phone).toBeVisible();
      await expect(address).toHaveCount(0);

      await page.locator('label[for="type-Delivery"]').click();
      await expect(phone).toBeVisible();
      await expect(address).toBeVisible();
    });

    test('validates required and malformed fields', async ({ page }) => {
      await page.locator('label[for="type-Delivery"]').click();
      await page.getByLabel('Phone Number *').fill('abc');
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page.getByText('Please enter your name.')).toBeVisible();
      await expect(page.getByText('Please enter a valid phone number.')).toBeVisible();
      await expect(page.getByText('Please enter your delivery address.')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible(); // nothing was submitted
    });

    test('places an Eat In order', async ({ page }) => {
      const customer = uniqueName('Eat In');
      await page.locator('label[for="type-DineIn"]').click();
      await page.getByLabel('Full Name *').fill(customer);
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page.getByRole('heading', { name: /Order Placed Successfully/ })).toBeVisible();
      await expect(page.getByText(`Thanks, ${customer}! Please take a seat`)).toBeVisible();
      await expect(page.locator('.confirmation .badge')).toHaveText('Pending');
      await expect(cartBadge(page)).toHaveCount(0);
    });

    test('places a Takeout order', async ({ page }) => {
      const customer = uniqueName('Takeout');
      await page.locator('label[for="type-Takeout"]').click();
      await page.getByLabel('Full Name *').fill(customer);
      await page.getByLabel('Phone Number *').fill('(555) 000-1111');
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page.getByText(`Thanks, ${customer}! We'll have it ready at the counter.`)).toBeVisible();
      await expect(page.getByText(/Your Order ID is #\d+/)).toBeVisible();
    });

    test('places a Delivery order', async ({ page }) => {
      const customer = uniqueName('Delivery');
      await page.locator('label[for="type-Delivery"]').click();
      await page.getByLabel('Full Name *').fill(customer);
      await page.getByLabel('Phone Number *').fill('555-123-4567');
      await page.getByLabel('Delivery Address *').fill('1 Test Street, Springfield');
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page.getByText(`Thanks, ${customer}!`)).toBeVisible();
      await expect(page.getByText('Delivering to: 1 Test Street, Springfield')).toBeVisible();
    });

    test('shows an error and keeps the cart when the API is unreachable', async ({ page }) => {
      await page.route('**/api/orders', route => route.abort());
      await page.locator('label[for="type-DineIn"]').click();
      await page.getByLabel('Full Name *').fill('Offline Customer');
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page.getByText(/Could not reach the restaurant/)).toBeVisible();
      await expect(cartBadge(page)).toHaveText('1');
    });
  });
});
