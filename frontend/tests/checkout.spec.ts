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
      const payAtCounter = page.locator('label[for="pay-Counter"]');

      await page.locator('label[for="type-DineIn"]').click();
      await expect(name).toBeVisible();
      await expect(phone).toHaveCount(0);
      await expect(address).toHaveCount(0);
      await expect(payAtCounter).toBeVisible();

      await page.locator('label[for="type-Takeout"]').click();
      await expect(phone).toBeVisible();
      await expect(address).toHaveCount(0);

      await page.locator('label[for="type-Delivery"]').click();
      await expect(phone).toBeVisible();
      await expect(address).toBeVisible();
      await expect(payAtCounter).toHaveCount(0); // delivery is always paid online
      await expect(page.getByText('Delivery orders are paid online')).toBeVisible();
    });

    test('asks for an email only when paying online', async ({ page }) => {
      const email = page.getByLabel('Email for your receipt *');
      await page.locator('label[for="type-Takeout"]').click();
      await expect(email).toBeVisible();
      await expect(page.getByRole('button', { name: /Pay ₦/ })).toBeVisible();

      await page.locator('label[for="pay-Counter"]').click();
      await expect(email).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Confirm & Place Order' })).toBeVisible();
    });

    test('lets online payers give a phone number instead of an email', async ({ page }) => {
      const email = page.getByLabel('Email for your receipt *');
      const phone = page.getByLabel('Phone Number *');

      await page.locator('label[for="type-DineIn"]').click();
      await expect(phone).toHaveCount(0);
      await page.locator('label[for="contact-Phone"]').click();
      await expect(email).toHaveCount(0);
      await expect(phone).toBeVisible(); // eat-in asks for it in the payment step

      await page.locator('label[for="type-Takeout"]').click();
      await expect(phone).toHaveCount(1); // takeout reuses the phone it already asks for
      await expect(page.getByText("We'll use the phone number above.")).toBeVisible();
    });

    test('validates required and malformed fields', async ({ page }) => {
      await page.locator('label[for="type-Delivery"]').click();
      await page.getByLabel('Phone Number *').fill('abc');
      await page.getByLabel('Email for your receipt *').fill('not-an-email');
      await page.getByRole('button', { name: /Pay ₦/ }).click();

      await expect(page.getByText('Please enter your name.')).toBeVisible();
      await expect(page.getByText('Please enter a valid phone number.')).toBeVisible();
      await expect(page.getByText('Please enter your delivery address.')).toBeVisible();
      await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible(); // nothing was submitted
    });

    test('places an Eat In order paid at the counter', async ({ page }) => {
      const customer = uniqueName('Eat In');
      await page.locator('label[for="type-DineIn"]').click();
      await page.getByLabel('Full Name *').fill(customer);
      await page.locator('label[for="pay-Counter"]').click();
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page).toHaveURL(/\/order\/[0-9a-f]{32}$/);
      await expect(page.getByRole('heading', { name: /Order Placed Successfully/ })).toBeVisible();
      await expect(page.getByText(`Thanks, ${customer}! Please take a seat`)).toBeVisible();
      await expect(page.locator('.confirmation .order-status')).toHaveText('Pending');
      await expect(page.locator('.confirmation .payment-status')).toHaveText('Pay at the counter');
      await expect(cartBadge(page)).toHaveCount(0);

      await page.reload(); // the confirmation is a real page, so it survives a reload
      await expect(page.getByText(`Thanks, ${customer}! Please take a seat`)).toBeVisible();
    });

    test('places a Takeout order paid at the counter', async ({ page }) => {
      const customer = uniqueName('Takeout');
      await page.locator('label[for="type-Takeout"]').click();
      await page.getByLabel('Full Name *').fill(customer);
      await page.getByLabel('Phone Number *').fill('(555) 000-1111');
      await page.locator('label[for="pay-Counter"]').click();
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page.getByText(`Thanks, ${customer}! We'll have it ready at the counter.`)).toBeVisible();
      await expect(page.getByText(/Your Order ID is #\d+/)).toBeVisible();
    });

    test('shows an error and keeps the cart when the API is unreachable', async ({ page }) => {
      await page.route('**/api/orders', route => route.abort());
      await page.locator('label[for="type-DineIn"]').click();
      await page.getByLabel('Full Name *').fill('Offline Customer');
      await page.locator('label[for="pay-Counter"]').click();
      await page.getByRole('button', { name: 'Confirm & Place Order' }).click();

      await expect(page.getByText(/Could not reach the restaurant/)).toBeVisible();
      await expect(cartBadge(page)).toHaveText('1');
    });
  });
});
