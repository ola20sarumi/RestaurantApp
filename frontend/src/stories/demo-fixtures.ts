import { CartItem, Order, Product } from '../app/models/restaurant.models';
import { DemoDb, createDemoDb } from '../demo/demo-data';

// Story data, taken from the demo build's sample data (src/demo/demo-data.ts) so stories show the real menu and
// naira prices. Everything is fixed, so screenshots only change when the UI does.

/**
 * "Now" for the demo's order history: 14 March 2026, 19:30 local time. The demo builds its orders in local time, so
 * the cashier page shows the same times in every time zone.
 */
export const DEMO_NOW = new Date(2026, 2, 14, 19, 30);

/** A fresh demo database for DEMO_NOW, with menu photos from Storybook's static files instead of Unsplash. */
export function demoDb(): DemoDb {
  const db = createDemoDb(DEMO_NOW);
  for (const product of db.products) {
    product.imageUrl = product.imageUrl?.replace('https://images.unsplash.com/photo-', 'demo-images/') + '.jpg';
  }
  // References are random in the demo; stories never show them, but they should still be the same every time.
  for (const order of db.orders) {
    order.reference = order.id.toString(16).padStart(32, '0');
  }
  return db;
}

const db = demoDb();

/** The demo menu, each product with its category (as GET /api/products returns them). */
export const DEMO_PRODUCTS: Product[] = db.products.map(product => ({
  ...product,
  category: db.categories.find(c => c.id === product.categoryId) ?? null
}));

export function demoProduct(name: string): Product {
  const product = DEMO_PRODUCTS.find(p => p.name === name);
  if (!product) throw new Error(`No demo product named "${name}"`);
  return product;
}

export function cartItem(name: string, quantity: number): CartItem {
  return { product: demoProduct(name), quantity };
}

/** A demo order as the cashier page gets it, optionally with some fields changed. */
export function demoOrder(id: number, changes: Partial<Order> = {}): Order {
  const order = db.orders.find(o => o.id === id);
  if (!order) throw new Error(`No demo order #${id}`);
  return { ...order, ...changes };
}
