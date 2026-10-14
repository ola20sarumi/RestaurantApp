import { expect, test } from '@playwright/test';

import {
  API_URL,
  addFirstProductToCart,
  cartBadge,
  createOnlineOrderViaApi,
  gotoApp,
  sendPaystackWebhook,
  uniqueName,
  usesFakePaystack
} from './helpers';

// Online payment runs against the fake Paystack in tests/fake-paystack.mjs (see playwright.config.ts).
test.describe('Online payment (Paystack)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await usesFakePaystack(request)), 'The API was not started by Playwright, so it is not using the fake Paystack');
  });

  async function checkoutAsDelivery(page: import('@playwright/test').Page, customer: string) {
    await addFirstProductToCart(page);
    await page.locator('nav a[href="/cart"]').click();
    await page.getByRole('link', { name: 'Go to checkout' }).click();
    await page.locator('label[for="type-Delivery"]').click();
    await page.getByLabel('Full Name *').fill(customer);
    await page.getByLabel('Phone Number *').fill('0803 123 4567');
    await page.getByLabel('Delivery Address *').fill('1 Test Street, Lagos');
    await page.getByLabel('Email for your receipt *').fill('customer@example.com');
    await page.getByRole('button', { name: /Pay ₦/ }).click();
    await expect(page.getByRole('heading', { name: 'Fake Paystack' })).toBeVisible();
  }

  test('pays a delivery order and shows it as paid', async ({ page }) => {
    const customer = uniqueName('Paystack');
    await checkoutAsDelivery(page, customer);

    await page.getByRole('link', { name: 'Pay' }).click();

    await expect(page).toHaveURL(/\/order\/[0-9a-f]{32}$/); // ?trxref is dropped once checked
    await expect(page.getByRole('heading', { name: /Order Placed Successfully/ })).toBeVisible();
    await expect(page.getByText(`Thanks, ${customer}!`)).toBeVisible();
    await expect(page.locator('.confirmation .payment-status')).toHaveText('Paid');
    await expect(cartBadge(page)).toHaveCount(0);
  });

  test('pays an eat-in order with a phone number instead of an email', async ({ page }) => {
    const customer = uniqueName('Paystack phone');
    await addFirstProductToCart(page);
    await page.locator('nav a[href="/cart"]').click();
    await page.getByRole('link', { name: 'Go to checkout' }).click();
    await page.locator('label[for="type-DineIn"]').click();
    await page.getByLabel('Full Name *').fill(customer);
    await page.locator('label[for="contact-Phone"]').click();
    await page.getByLabel('Phone Number *').fill('0803 123 4567');
    await page.getByRole('button', { name: /Pay ₦/ }).click();

    await expect(page.getByRole('heading', { name: 'Fake Paystack' })).toBeVisible();
    await page.getByRole('link', { name: 'Pay' }).click();

    await expect(page.getByRole('heading', { name: /Order Placed Successfully/ })).toBeVisible();
    await expect(page.locator('.confirmation .payment-status')).toHaveText('Paid');
  });

  test('keeps the cart and offers a retry when the customer cancels on Paystack', async ({ page }) => {
    await checkoutAsDelivery(page, uniqueName('Paystack cancel'));

    await page.getByRole('link', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Payment not completed' })).toBeVisible();
    await expect(cartBadge(page)).toHaveText('1');

    await page.getByRole('button', { name: /Pay ₦/ }).click();
    await expect(page.getByRole('heading', { name: 'Fake Paystack' })).toBeVisible();
    await page.getByRole('link', { name: 'Pay' }).click();

    await expect(page.getByRole('heading', { name: /Order Placed Successfully/ })).toBeVisible();
    await expect(page.locator('.confirmation .payment-status')).toHaveText('Paid');
    await expect(cartBadge(page)).toHaveCount(0);
  });

  test('the webhook marks an order paid only with a valid signature and the right amount', async ({ request }) => {
    const order = await createOnlineOrderViaApi(request, uniqueName('Webhook'));
    const paymentStatus = async () =>
      (await (await request.post(`${API_URL}/payments/${order.reference}/verify`)).json()).paymentStatus;
    const charge = (amount: number) => ({
      event: 'charge.success',
      data: { reference: `${order.reference}-1`, status: 'success', amount, currency: 'NGN' }
    });
    const amountInKobo = Math.round(order.totalAmount * 100);

    const forged = await sendPaystackWebhook(request, charge(amountInKobo), { validSignature: false });
    expect(forged.status()).toBe(401);
    expect(await paymentStatus()).toBe('Unpaid');

    const underpaid = await sendPaystackWebhook(request, charge(amountInKobo - 100));
    expect(underpaid.status()).toBe(200); // acknowledged so Paystack stops retrying, but not accepted
    expect(await paymentStatus()).toBe('Unpaid');

    const paid = await sendPaystackWebhook(request, charge(amountInKobo));
    expect(paid.status()).toBe(200);
    expect(await paymentStatus()).toBe('Paid');

    const replayed = await sendPaystackWebhook(request, charge(amountInKobo));
    expect(replayed.status()).toBe(200);
    expect(await paymentStatus()).toBe('Paid');
  });
});

test.describe('Payment rules', () => {
  test('the API rejects delivery paid at the counter and online payment without an email or phone', async ({ request }) => {
    const products = await (await request.get(`${API_URL}/products`)).json();
    const order = {
      customerName: 'Rules',
      customerPhone: '0803 123 4567',
      items: [{ productId: products[0].id, quantity: 1 }]
    };

    const deliveryAtCounter = await request.post(`${API_URL}/orders`, {
      data: { ...order, fulfillmentType: 'Delivery', deliveryAddress: '1 Test Street', paymentMethod: 'Counter' }
    });
    expect(deliveryAtCounter.status()).toBe(400);
    expect(JSON.stringify(await deliveryAtCounter.json())).toContain('Delivery orders must be paid online.');

    const onlineWithoutContact = await request.post(`${API_URL}/orders`, {
      data: { customerName: 'Rules', items: order.items, fulfillmentType: 'DineIn', paymentMethod: 'Online' }
    });
    expect(onlineWithoutContact.status()).toBe(400);
    expect(JSON.stringify(await onlineWithoutContact.json())).toContain('An email address or phone number is required to pay online.');
  });

  test('shows an unknown order reference as not found', async ({ page }) => {
    await gotoApp(page, '/order/00000000000000000000000000000000');
    await expect(page.getByRole('alert')).toHaveText("We couldn't find that order. Please check the link.");
  });
});
