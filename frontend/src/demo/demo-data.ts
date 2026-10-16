import { Category, FulfillmentType, Order, OrderItem, PaymentMethod, Product, StaffRole } from '../app/models/restaurant.models';

// Sample data for the demo build (npm run build:demo). It mirrors backend/Data/SeedData.cs, plus two weeks of
// orders so the cashier and reports pages have something to show. A shared demo page can't load images from other
// sites, so scripts/build-demo.mjs embeds copies of these photos (src/demo/images) and main.demo.ts swaps them in.

export interface DemoDb {
  categories: Category[];
  products: Product[];
  orders: Order[];
  nextIds: { category: number; product: number; order: number; orderItem: number };
}

/** Staff logins shown in the demo banner. */
export const DEMO_STAFF: { username: string; password: string; role: StaffRole }[] = [
  { username: 'admin', password: 'demo', role: 'Admin' },
  { username: 'cashier', password: 'demo', role: 'Cashier' }
];

const MENU: { name: string; description: string; items: [string, string, number, string][] }[] = [
  {
    name: 'Appetizers',
    description: 'Starters to begin your meal',
    items: [
      ['Crispy Mozzarella Sticks', 'Golden fried mozzarella served with warm marinara sauce.', 3500, '1531749668029-2db88e4276c7'],
      ['Garlic Herb Bread', 'Toasted artisan bread topped with garlic butter and fresh parsley.', 2000, '1556008531-57e6eefc7be4'],
      ['Buffalo Chicken Wings', '8 crispy wings tossed in spicy buffalo sauce with ranch dip.', 5500, '1567620832903-9fc6debc209f']
    ]
  },
  {
    name: 'Main Courses',
    description: 'Hearty and delicious entrees',
    items: [
      ['Classic Cheeseburger', 'Angus beef patty, cheddar, lettuce, tomato, and special sauce on brioche.', 6500, '1568901346375-23c9450c58cd'],
      ['Margherita Pizza', 'Fresh mozzarella, San Marzano tomato sauce, and basil on crispy crust.', 8000, '1604382354936-07c5d9983bd3'],
      ['Fettuccine Alfredo', 'Creamy parmesan sauce tossed with fresh fettuccine pasta.', 7000, '1645112411341-6c4fd023714a'],
      ['Grilled Salmon Bowl', 'Wild-caught salmon with quinoa, roasted veggies, and lemon tahini.', 12000, '1546069901-ba9599a7e63c']
    ]
  },
  {
    name: 'Desserts & Drinks',
    description: 'Sweet treats and refreshing beverages',
    items: [
      ['Chocolate Lava Cake', 'Warm chocolate cake with a molten center, served with vanilla ice cream.', 3500, '1606313564200-e75d5e30476c'],
      ['New York Cheesecake', 'Classic creamy cheesecake with strawberry drizzle.', 3000, '1533134242443-d4fd215305ad'],
      ['Fresh Iced Lemonade', 'House-made freshly squeezed lemonade over ice.', 1500, '1513558161293-cdaf765ed2fd']
    ]
  }
];

// Made-up sample customers.
const CUSTOMERS = [
  'Adaeze Okafor', 'Tunde Bakare', 'Chiamaka Eze', 'Ibrahim Musa', 'Funke Adeyemi',
  'Emeka Nwosu', 'Zainab Bello', 'Segun Ojo', 'Ngozi Obi', 'Kelechi Uche', 'Bisi Afolabi', 'Yusuf Danjuma'
];
const STREETS = ['12 Admiralty Way, Lekki', '4 Awolowo Road, Ikoyi', '27 Allen Avenue, Ikeja', '9 Adeola Odeku Street, Victoria Island'];

/** The API sends OrderDate as UTC without a "Z" (the pages add it), so the demo does the same. */
export function apiDate(date: Date): string {
  return date.toISOString().replace('Z', '');
}

export function randomReference(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** A fresh demo database: the sample menu and orders over the last 14 days (today's still in progress). */
export function createDemoDb(now = new Date()): DemoDb {
  const categories: Category[] = [];
  const products: Product[] = [];
  MENU.forEach((group, i) => {
    const category: Category = { id: i + 1, name: group.name, description: group.description, products: [] };
    categories.push(category);
    for (const [name, description, price, photo] of group.items) {
      products.push({
        id: products.length + 1,
        name,
        description,
        price,
        imageUrl: `https://images.unsplash.com/photo-${photo}`,
        isAvailable: true,
        categoryId: category.id,
        category: null
      });
    }
  });

  // Deterministic pseudo-random numbers, so every visitor starts with the same history.
  let seed = 20261014;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];

  const orders: Order[] = [];
  let orderItemId = 1;
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const count = daysAgo === 0 ? 5 : 3 + Math.floor(random() * 5);
    for (let n = 0; n < count; n++) {
      const placed = new Date(now);
      placed.setDate(placed.getDate() - daysAgo);
      placed.setHours(11 + Math.floor((n / count) * 10), Math.floor(random() * 60), 0, 0);
      if (placed > now) placed.setTime(now.getTime() - (count - n) * 9 * 60_000);

      const fulfillmentType = pick<FulfillmentType>(['DineIn', 'DineIn', 'Takeout', 'Takeout', 'Delivery']);
      const paymentMethod: PaymentMethod = fulfillmentType === 'Delivery' || random() < 0.5 ? 'Online' : 'Counter';
      const status = daysAgo === 0
        ? ['Completed', 'Ready', 'Preparing', 'Pending', 'Pending'][n]
        : random() < 0.9 ? 'Completed' : 'Cancelled';
      const paid = paymentMethod === 'Online' || status === 'Completed';
      const name = pick(CUSTOMERS);
      const id = orders.length + 1;

      const items: OrderItem[] = [];
      const lines = 1 + Math.floor(random() * 3);
      for (let l = 0; l < lines; l++) {
        const product = pick(products);
        if (items.some(i => i.productId === product.id)) continue;
        items.push({
          id: orderItemId++, quantity: 1 + Math.floor(random() * 2), unitPrice: product.price,
          orderId: id, productId: product.id, product
        });
      }

      orders.push({
        id,
        reference: randomReference(),
        orderDate: apiDate(placed),
        totalAmount: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
        status,
        customerName: name,
        customerPhone: fulfillmentType === 'DineIn' ? '' : `0803 555 ${String(1000 + id).slice(-4)}`,
        customerEmail: paymentMethod === 'Online' ? `${name.split(' ')[0].toLowerCase()}@example.com` : null,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'Delivery' ? pick(STREETS) : null,
        paymentMethod,
        paymentStatus: paid ? 'Paid' : 'Unpaid',
        paidAt: paid ? placed.toISOString() : null,
        paystackReference: paymentMethod === 'Online' ? 'demo' : null,
        items
      });
    }
  }

  return {
    categories,
    products,
    orders,
    nextIds: { category: categories.length + 1, product: products.length + 1, order: orders.length + 1, orderItem: orderItemId }
  };
}
