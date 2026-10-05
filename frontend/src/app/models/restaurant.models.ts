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

export interface Order {
  id: number;
  orderDate: string;
  totalAmount: number;
  status: string;
  items: OrderItem[];
}

// Body for POST /api/orders. The server looks up prices and calculates the total.
export interface CreateOrderRequest {
  items: { productId: number; quantity: number }[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const ORDER_STATUSES = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'] as const;
