import { createHmac } from 'node:crypto';

import { APIRequestContext, Page, expect } from '@playwright/test';

/** Same API the app calls (see src/app/api.config.ts). */
export const API_URL = 'http://localhost:5044/api';

/**
 * Opens a page and waits until Angular has hydrated it. Pages are server-rendered, so
 * buttons are visible before their click handlers are attached; clicking too early does nothing.
 */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => {
    const ng = (window as any).ng;
    const root = document.querySelector('app-root');
    return !!ng && !!root && !!ng.getComponent(root);
  });
}

/** Adds the first menu item to the cart and returns its name. */
export async function addFirstProductToCart(page: Page): Promise<{ name: string }> {
  await gotoApp(page, '/menu');
  const card = page.locator('.product-card').first();
  const name = (await card.locator('.card-title').innerText()).trim();
  await card.getByRole('button', { name: /Add/ }).click();
  await expect(cartBadge(page)).toHaveText('1');
  return { name };
}

/** The item-count badge on the "Cart" link in the navbar. */
export function cartBadge(page: Page) {
  return page.locator('nav a[href="/cart"] .badge');
}

/** A customer name that is unique per test, so tests can find "their" order on the cashier page. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Places a pay-at-counter Takeout order directly through the API (faster than clicking through checkout). */
export async function createOrderViaApi(request: APIRequestContext, customerName: string) {
  return placeOrderViaApi(request, customerName, 'Counter');
}

/** Places a pay-online Takeout order through the API; it stays unpaid until Paystack confirms a payment. */
export async function createOnlineOrderViaApi(request: APIRequestContext, customerName: string) {
  return placeOrderViaApi(request, customerName, 'Online');
}

async function placeOrderViaApi(request: APIRequestContext, customerName: string, paymentMethod: 'Online' | 'Counter') {
  const products = await (await request.get(`${API_URL}/products`)).json();
  const response = await request.post(`${API_URL}/orders`, {
    data: {
      fulfillmentType: 'Takeout',
      customerName,
      customerPhone: '555-000-1111',
      paymentMethod,
      customerEmail: paymentMethod === 'Online' ? 'e2e@example.com' : undefined,
      items: [{ productId: products[0].id, quantity: 2 }]
    }
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number; reference: string; totalAmount: number };
}

/** The fake Paystack (tests/fake-paystack.mjs) that Playwright points the API at, and its secret key. */
export const FAKE_PAYSTACK_URL = 'http://localhost:5055/';
export const FAKE_PAYSTACK_SECRET = 'sk_test_fake_for_e2e';

/**
 * True when the API talks to the fake Paystack. Not the case when Playwright reused an API you started yourself
 * (it uses your own keys), so the online-payment tests skip themselves then.
 */
export async function usesFakePaystack(request: APIRequestContext): Promise<boolean> {
  const order = await createOnlineOrderViaApi(request, uniqueName('Paystack check'));
  const response = await request.post(`${API_URL}/payments/${order.reference}/initialize`);
  return response.ok() && (await response.json()).authorizationUrl.startsWith(FAKE_PAYSTACK_URL);
}

/** Sends a Paystack webhook event to the API, signed like Paystack does (or with a wrong signature). */
export async function sendPaystackWebhook(request: APIRequestContext, event: object, { validSignature = true } = {}) {
  const body = JSON.stringify(event);
  const signature = createHmac('sha512', validSignature ? FAKE_PAYSTACK_SECRET : 'wrong-key').update(body).digest('hex');
  return request.post(`${API_URL}/payments/webhook`, {
    data: body,
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature }
  });
}

/** Dev staff accounts seeded from backend/appsettings.Development.json. */
export const STAFF = {
  admin: { username: 'admin', password: 'Admin123!' },
  cashier: { username: 'cashier', password: 'Cashier123!' }
} as const;

/**
 * Signs in through the API and stores the session where AuthService looks for it, so the next page opened
 * is already signed in (faster than filling in the login form in every test).
 */
export async function loginAs(page: Page, request: APIRequestContext, who: keyof typeof STAFF): Promise<void> {
  const response = await request.post(`${API_URL}/auth/login`, { data: STAFF[who] });
  expect(response.ok()).toBeTruthy();
  const session = await response.json();
  await page.addInitScript(value => sessionStorage.setItem('restaurant-staff-session', value), JSON.stringify(session));
}
