// Mirrors the backend EF entities (backend/Models) as serialized to camelCase JSON.
// Back-references are null because the API ignores reference cycles.

export interface Category {
  id: number;
  name: string;
  description: string | null;
  products?: (Product | null)[];
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: number;
  category: Category | null;
}

export interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  orderId: number;
  productId: number;
  product: Product | null;
}

export type FulfillmentType = 'DineIn' | 'Takeout' | 'Delivery';

/** Labels and icons (Bootstrap Icons) for each order type, shared by checkout and the cashier dashboard. */
export const FULFILLMENT_OPTIONS: { value: FulfillmentType; label: string; icon: string; hint: string }[] = [
  { value: 'DineIn', label: 'Eat In', icon: 'bi-cup-hot', hint: 'Enjoy your meal at the restaurant' },
  { value: 'Takeout', label: 'Takeout', icon: 'bi-bag', hint: 'Pick it up at the counter' },
  { value: 'Delivery', label: 'Delivery', icon: 'bi-truck', hint: 'We bring it to your door' }
];

/** "Online" = Paystack before the kitchen sees the order; "Counter" = cash/POS in person. Delivery is always Online. */
export type PaymentMethod = 'Online' | 'Counter';
export type PaymentStatus = 'Unpaid' | 'Paid';

export interface Order {
  id: number;
  reference: string;          // unguessable id for the customer's /order/:reference page
  orderDate: string;
  totalAmount: number;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt: string | null;      // UTC
  paystackReference: string | null;
  items: OrderItem[];
}

// Body for POST /api/orders. The server looks up prices and calculates the total.
export interface CreateOrderRequest {
  fulfillmentType: FulfillmentType;
  customerName: string;      // required for every order type
  customerPhone?: string;    // takeout and delivery; eat-in only when paying online by phone
  deliveryAddress?: string;  // delivery only
  paymentMethod: PaymentMethod;
  customerEmail?: string;    // online payment: email or phone is required (Paystack emails the receipt)
  items: { productId: number; quantity: number }[];
}

/** GET /api/orders/track/:reference — the customer's view of their order (no contact details). */
export interface OrderTracking {
  id: number;
  reference: string;
  orderDate: string;
  status: string;
  fulfillmentType: FulfillmentType;
  customerName: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: { name: string; quantity: number; unitPrice: number }[];
}

/** Customer details entered on the checkout page. */
export type CustomerDetails = Omit<CreateOrderRequest, 'items'>;

export interface CartItem {
  product: Product;
  quantity: number;
}

export const ORDER_STATUSES = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'] as const;

// Bodies for the admin endpoints (POST/PUT /api/categories and /api/products).
export interface CategoryRequest {
  name: string;
  description: string | null;
}

export interface ProductRequest {
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: number;
}

// Staff login (POST /api/auth/login). Admins can use the admin and cashier pages; cashiers only the cashier page.
export type StaffRole = 'Admin' | 'Cashier';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface StaffSession {
  token: string;
  username: string;
  role: StaffRole;
  expiresAt: string; // ISO date (UTC)
}

// GET /api/orders/report (admins): finished orders placed between `from` and `to` (inclusive, yyyy-MM-dd).
// Revenue, items sold and products count completed orders only.
export interface OrderReport {
  from: string;
  to: string;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  itemsSold: number;
  byFulfillment: { fulfillmentType: FulfillmentType; completedOrders: number; cancelledOrders: number; revenue: number }[];
  days: { date: string; completedOrders: number; cancelledOrders: number; revenue: number }[];
  products: { productId: number; name: string; quantity: number; revenue: number }[];
}
