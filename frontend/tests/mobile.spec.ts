import { Page, expect, test } from '@playwright/test';

import { addFirstProductToCart, createOrderViaApi, gotoApp, loginAs, uniqueName } from './helpers';

/**
 * Fails when the page scrolls sideways, and names the elements that stick out past the right edge (widest first),
 * skipping anything inside a container that clips or scrolls it (e.g. .table-responsive).
 */
async function expectNoHorizontalScroll(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    const clippedByAncestor = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    const offenders = Array.from(document.body.querySelectorAll('*'))
      .map(el => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ el, rect }) => rect.width > 0 && rect.right > viewport + 1 && !clippedByAncestor(el))
      .sort((a, b) => b.rect.width - a.rect.width)
      .slice(0, 5)
      .map(({ el, rect }) => {
        const classes = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';
        return `${el.tagName.toLowerCase()}${classes} (${Math.round(rect.width)}px wide, right edge at ${Math.round(rect.right)}px)`;
      });
    return { scrollWidth: root.scrollWidth, clientWidth: viewport, offenders };
  });

  expect(result.scrollWidth, `Page is wider than the ${result.clientWidth}px viewport. Sticking out:\n`
    + (result.offenders.join('\n') || '(nothing found outside clipping containers)')).toBeLessThanOrEqual(result.clientWidth);
}

/** Every customer and staff page, opened the way a user gets there. */
async function visitEveryPage(page: Page, request: Parameters<typeof createOrderViaApi>[0], check: () => Promise<void>) {
  await gotoApp(page, '/menu');
  await expect(page.locator('.product-card').first()).toBeVisible();
  await check();

  await addFirstProductToCart(page);
  await gotoApp(page, '/cart');
  await expect(page.getByRole('link', { name: 'Go to checkout' })).toBeVisible();
  await check();

  await gotoApp(page, '/checkout');
  for (const type of ['DineIn', 'Takeout', 'Delivery']) {
    await page.locator(`label[for="type-${type}"]`).click();
    await expect(page.locator('#customerName')).toBeVisible();
    await check();
  }

  const order = await createOrderViaApi(request, uniqueName('Mobile'));
  await gotoApp(page, `/order/${order.reference}`);
  await expect(page.getByText(/Your Order ID is #\d+/)).toBeVisible();
  await check();

  await gotoApp(page, '/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await check();

  // The admin sees the most navbar links, so this is the widest navbar.
  await loginAs(page, request, 'admin');
  await gotoApp(page, '/admin');
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await check();

  await gotoApp(page, '/admin/reports');
  await expect(page.getByTestId('revenue')).toBeVisible();
  await page.getByRole('button', { name: 'This month' }).click();
  await expect(page.locator('table:has(tfoot)')).toBeVisible();
  await check();

  await gotoApp(page, '/cashier');
  await expect(page.locator('app-order-card').first()).toBeVisible();
  await check();
}

test.describe('phone (360px)', () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test('no page scrolls sideways', async ({ page, request }) => {
    test.setTimeout(90_000);
    await visitEveryPage(page, request, () => expectNoHorizontalScroll(page));
  });

  test('the navbar stays on one line for a signed-in admin', async ({ page, request }) => {
    await loginAs(page, request, 'admin');
    await gotoApp(page, '/admin');
    const nav = page.locator('nav.app-navbar');
    await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Sign out' })).toBeVisible();
    // One row of links: the bar is no taller than a single 44px tap target plus its padding.
    expect((await nav.boundingBox())!.height).toBeLessThan(70);
  });

  test('every category chip is fully on screen', async ({ page }) => {
    await gotoApp(page, '/menu');
    const chips = page.getByRole('group', { name: 'Filter by category' }).getByRole('button');
    await expect(chips.filter({ hasText: 'Main Courses' })).toBeVisible();
    for (const chip of await chips.all()) {
      await expect(chip).toBeInViewport({ ratio: 1 });
    }
  });
});

test.describe('phone checkout', () => {
  test.use({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });

  test('submitting without an order type brings the reason into view', async ({ page }) => {
    await addFirstProductToCart(page);
    await gotoApp(page, '/checkout');
    const submit = page.getByRole('button', { name: 'Confirm & Place Order' });
    // Scroll so the order-type tiles are off-screen above, as after scrolling down to the button.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('label[for="type-DineIn"]')).not.toBeInViewport();

    await submit.tap();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText("Please choose how you'd like your order.");
    await expect(alert).toBeInViewport();
    await expect(page.locator('label[for="type-DineIn"]')).toBeInViewport();
  });
});

test.describe('desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('no page scrolls sideways and the menu shows four columns', async ({ page, request }) => {
    test.setTimeout(90_000);
    await gotoApp(page, '/menu');
    const tops = await page.locator('app-product-card').evaluateAll(cards =>
      cards.slice(0, 4).map(c => Math.round(c.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);

    await visitEveryPage(page, request, () => expectNoHorizontalScroll(page));
  });
});
