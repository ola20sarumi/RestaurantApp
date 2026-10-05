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

export interface Order {
  id: number;
  orderDate: string;
  totalAmount: number;
  status: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string | null;
  items: OrderItem[];
}

// Body for POST /api/orders. The server looks up prices and calculates the total.
export interface CreateOrderRequest {
  fulfillmentType: FulfillmentType;
  customerName: string;      // required for every order type
  customerPhone?: string;    // takeout and delivery only
  deliveryAddress?: string;  // delivery only
  items: { productId: number; quantity: number }[];
}

/** Customer details entered on the checkout page. */
export type CustomerDetails = Omit<CreateOrderRequest, 'items'>;

export interface CartItem {
  product: Product;
  quantity: number;
}

export const ORDER_STATUSES = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'] as const;
