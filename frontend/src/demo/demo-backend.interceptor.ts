import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';

import { API_BASE_URL } from '../app/api.config';
import {
  CategoryRequest, CreateOrderRequest, FulfillmentType, LoginRequest, ORDER_STATUSES, Order, OrderReport, OrderTracking,
  Product, ProductRequest, StaffRole
} from '../app/models/restaurant.models';
import { DEMO_STAFF, DemoDb, apiDate, createDemoDb, randomReference } from './demo-data';

// Demo build only: answers the app's API calls in the browser instead of calling the ASP.NET Core backend, following
// the same rules (see backend/Controllers). Data is saved in this visitor's localStorage, so each visitor has their own.

const STORAGE_KEY = 'restaurant-demo-db-v1';
const LATENCY_MS = 250;

let db: DemoDb | null = null;

function load(): DemoDb {
  if (db) return db;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return (db = JSON.parse(saved) as DemoDb);
  } catch {
    // Storage unavailable or corrupt: start fresh for this visit.
  }
  return (db = createDemoDb());
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage unavailable (e.g. private mode): changes last for this visit only.
  }
}

/** Clears the visitor's demo data (the banner's "Reset demo" button). */
export function resetDemo(): void {
  db = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing saved.
  }
}

export const demoBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);
  let result: Result;
  try {
    result = handle(req, load());
  } catch (e) {
    console.error(e);
    result = problem(500, 'Something went wrong in the demo.');
  }
  const response$: Observable<HttpResponse<unknown>> = result.status >= 400
    ? throwError(() => new HttpErrorResponse({ status: result.status, error: result.body, url: req.url }))
    : of(new HttpResponse({ status: result.status, body: result.body ?? null, url: req.url }));
  return response$.pipe(delay(LATENCY_MS));
};

interface Result { status: number; body?: unknown }
const ok = (body: unknown, status = 200): Result => ({ status, body });
const noContent = (): Result => ({ status: 204 });
const problem = (status: number, detail: string): Result => ({ status, body: { status, detail } });
const invalid = (errors: Record<string, string[]>): Result => ({ status: 400, body: { status: 400, errors } });

function handle(req: HttpRequest<unknown>, data: DemoDb): Result {
  const url = new URL(req.urlWithParams, location.href);
  const path = url.pathname.replace(new URL(API_BASE_URL).pathname, '').split('/').filter(Boolean);
  const [resource, idOrRef, action] = path;
  const id = Number(idOrRef);
  const role = roleOf(req);
  const body = req.body as never;
  const method = req.method;

  const requireRole = (...roles: StaffRole[]): Result | null =>
    role === null ? problem(401, 'Please sign in.') : roles.includes(role) ? null : problem(403, 'Not allowed.');

  switch (resource) {
    case 'auth':
      return login(body);

    case 'categories': {
      if (method === 'GET') return ok([...data.categories].sort((a, b) => a.name.localeCompare(b.name)));
      return requireRole('Admin') ?? saveAfter(categories(method, id, body, data));
    }

    case 'products': {
      if (method === 'GET') {
        const all = url.searchParams.get('includeUnavailable') === 'true';
        if (all && role !== 'Admin') return problem(403, 'Not allowed.');
        return ok(data.products
          .filter(p => all || p.isAvailable)
          .map(p => withCategory(p, data))
          .sort((a, b) => a.name.localeCompare(b.name)));
      }
      return requireRole('Admin') ?? saveAfter(products(method, id, body, data));
    }

    case 'orders': {
      if (method === 'POST' && !idOrRef) return saveAfter(createOrder(body, data));
      if (idOrRef === 'report') return requireRole('Admin') ?? report(url.searchParams, data);
      const denied = requireRole('Admin', 'Cashier');
      if (denied) return denied;
      if (method === 'GET' && !idOrRef) {
        const status = url.searchParams.get('status');
        return ok(data.orders
          .filter(o => o.paymentMethod !== 'Online' || o.paymentStatus === 'Paid')
          .filter(o => !status || o.status === status)
          .sort((a, b) => b.orderDate.localeCompare(a.orderDate)));
      }
      const order = data.orders.find(o => o.id === id);
      if (!order) return problem(404, 'Order not found.');
      if (method === 'GET') return ok(order);
      if (action === 'status') {
        const status = typeof body === 'string' ? JSON.parse(body) : body;
        if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
          return problem(400, `Status must be one of: ${ORDER_STATUSES.join(', ')}`);
        }
        order.status = status;
        return saveAfter(noContent());
      }
      if (action === 'mark-paid') {
        if (order.paymentMethod !== 'Counter') return problem(409, 'Online orders are marked paid by Paystack.');
        if (order.paymentStatus !== 'Paid') {
          order.paymentStatus = 'Paid';
          order.paidAt = new Date().toISOString();
        }
        return saveAfter(noContent());
      }
      break;
    }

    case 'payments': {
      const order = data.orders.find(o => o.reference === idOrRef);
      if (!order) return problem(404, 'Order not found.');
      if (action === 'initialize') {
        if (order.paymentMethod !== 'Online') return problem(409, 'This order is paid at the counter.');
        if (order.paymentStatus === 'Paid') return problem(409, 'This order has already been paid.');
        if (order.status === 'Cancelled') return problem(409, 'This order was cancelled.');
        // The demo's stand-in for Paystack's checkout page (DemoPayComponent).
        return ok({ authorizationUrl: `#/demo-pay/${order.reference}` });
      }
      if (action === 'verify') {
        // DemoPayComponent sends the customer back with "<reference>-success" when they choose to pay.
        const trxref = url.searchParams.get('trxref');
        if (order.paymentMethod === 'Online' && order.paymentStatus === 'Unpaid' && trxref === `${order.reference}-success`) {
          order.paymentStatus = 'Paid';
          order.paidAt = new Date().toISOString();
          order.paystackReference = trxref;
          save();
        }
        return ok(tracking(order));
      }
      break;
    }
  }
  return problem(404, 'Not found.');
}

function saveAfter(result: Result): Result {
  if (result.status < 400) save();
  return result;
}

/** Tokens look like "demo-Admin"; the expiry is checked by AuthService in the app itself. */
function roleOf(req: HttpRequest<unknown>): StaffRole | null {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  return token === 'demo-Admin' ? 'Admin' : token === 'demo-Cashier' ? 'Cashier' : null;
}

function login(request: LoginRequest): Result {
  const user = DEMO_STAFF.find(s => s.username === request.username?.trim().toLowerCase() && s.password === request.password);
  if (!user) return problem(401, 'Incorrect username or password.');
  const expiresAt = new Date(Date.now() + 8 * 3600_000).toISOString();
  return ok({ token: `demo-${user.role}`, username: user.username, role: user.role, expiresAt });
}

function withCategory(product: Product, data: DemoDb): Product {
  const category = data.categories.find(c => c.id === product.categoryId);
  return { ...product, category: category ? { ...category, products: null as never } : null };
}

function categories(method: string, id: number, request: CategoryRequest, data: DemoDb): Result {
  if (method === 'DELETE') {
    const category = data.categories.find(c => c.id === id);
    if (!category) return problem(404, 'Category not found.');
    if (data.products.some(p => p.categoryId === id)) {
      return problem(409, `"${category.name}" still has products. Move or delete them first.`);
    }
    data.categories = data.categories.filter(c => c.id !== id);
    return noContent();
  }

  const name = request.name?.trim() ?? '';
  if (!name) return invalid({ Name: ['Category name is required.'] });
  if (data.categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
    return problem(409, `A category named "${name}" already exists.`);
  }
  const description = request.description?.trim() || null;
  if (method === 'POST') {
    const category = { id: data.nextIds.category++, name, description, products: [] };
    data.categories.push(category);
    return ok(category, 201);
  }
  const category = data.categories.find(c => c.id === id);
  if (!category) return problem(404, 'Category not found.');
  Object.assign(category, { name, description });
  return ok(category);
}

function products(method: string, id: number, request: ProductRequest, data: DemoDb): Result {
  if (method === 'DELETE') {
    const product = data.products.find(p => p.id === id);
    if (!product) return problem(404, 'Product not found.');
    if (data.orders.some(o => o.items.some(i => i.productId === id))) {
      return problem(409, `"${product.name}" appears in past orders, so it can't be deleted. Mark it unavailable instead.`);
    }
    data.products = data.products.filter(p => p.id !== id);
    return noContent();
  }

  const errors: Record<string, string[]> = {};
  if (!request.name?.trim()) errors['Name'] = ['Product name is required.'];
  if (!(request.price >= 0.01 && request.price <= 1_000_000)) errors['Price'] = ['Price must be between 0.01 and 1,000,000.'];
  if (Object.keys(errors).length) return invalid(errors);
  if (!data.categories.some(c => c.id === request.categoryId)) {
    return problem(400, `Category ${request.categoryId} does not exist.`);
  }

  const fields = {
    name: request.name.trim(),
    description: request.description?.trim() || null,
    price: request.price,
    imageUrl: request.imageUrl?.trim() || null,
    isAvailable: request.isAvailable,
    categoryId: request.categoryId
  };
  if (method === 'POST') {
    const product: Product = { id: data.nextIds.product++, ...fields, category: null };
    data.products.push(product);
    return ok(withCategory(product, data), 201);
  }
  const product = data.products.find(p => p.id === id);
  if (!product) return problem(404, 'Product not found.');
  Object.assign(product, fields);
  return ok(withCategory(product, data));
}

function createOrder(request: CreateOrderRequest, data: DemoDb): Result {
  const blank = (value?: string | null) => !value || !value.trim();
  const errors: Record<string, string[]> = {};
  if (blank(request.customerName)) errors['CustomerName'] = ['Your name is required.'];
  if (request.paymentMethod === 'Online' && blank(request.customerEmail) && blank(request.customerPhone)) {
    errors['CustomerEmail'] = ['An email address or phone number is required to pay online.'];
  } else if (request.fulfillmentType === 'Delivery' && request.paymentMethod !== 'Online') {
    errors['PaymentMethod'] = ['Delivery orders must be paid online.'];
  }
  if (request.fulfillmentType !== 'DineIn' && blank(request.customerPhone)) {
    errors['CustomerPhone'] = ['A phone number is required for takeout and delivery orders.'];
  }
  if (request.fulfillmentType === 'Delivery' && blank(request.deliveryAddress)) {
    errors['DeliveryAddress'] = ['A delivery address is required for delivery orders.'];
  }
  if (!request.items?.length) errors['Items'] = ['Your cart is empty.'];
  if (Object.keys(errors).length) return invalid(errors);

  const missing = request.items.map(i => i.productId).filter(pid => !data.products.some(p => p.id === pid && p.isAvailable));
  if (missing.length) return problem(400, `Products not found or unavailable: ${missing.join(', ')}`);

  const id = data.nextIds.order++;
  const items = request.items.map(i => {
    const product = data.products.find(p => p.id === i.productId)!;
    return { id: data.nextIds.orderItem++, quantity: i.quantity, unitPrice: product.price, orderId: id, productId: product.id, product };
  });
  const order: Order = {
    id,
    reference: randomReference(),
    orderDate: apiDate(new Date()),
    totalAmount: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    status: 'Pending',
    customerName: request.customerName.trim(),
    customerPhone: request.customerPhone?.trim() ?? '',
    customerEmail: request.paymentMethod === 'Online' && !blank(request.customerEmail) ? request.customerEmail!.trim() : null,
    fulfillmentType: request.fulfillmentType,
    deliveryAddress: request.fulfillmentType === 'Delivery' ? request.deliveryAddress!.trim() : null,
    paymentMethod: request.paymentMethod,
    paymentStatus: 'Unpaid',
    paidAt: null,
    paystackReference: null,
    items
  };
  data.orders.push(order);
  return ok(order, 201);
}

function tracking(order: Order): OrderTracking {
  return {
    id: order.id,
    reference: order.reference,
    orderDate: order.orderDate,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items.map(i => ({ name: i.product?.name ?? 'Item', quantity: i.quantity, unitPrice: i.unitPrice }))
  };
}

/** Same report as GET /api/orders/report, using the browser's own calendar days. */
function report(params: URLSearchParams, data: DemoDb): Result {
  const today = localDate(new Date());
  const from = params.get('from') || params.get('to') || today;
  const to = params.get('to') || params.get('from') || today;
  if (to < from) return problem(400, 'The end date must be on or after the start date.');

  const dayList: string[] = [];
  for (let d = new Date(`${from}T00:00:00`); localDate(d) <= to; d.setDate(d.getDate() + 1)) dayList.push(localDate(d));
  if (dayList.length > 366) return problem(400, 'Pick a range of at most 366 days.');

  const finished = data.orders.filter(o => {
    const day = localDate(new Date(o.orderDate + 'Z'));
    return day >= from && day <= to && (o.status === 'Completed' || o.status === 'Cancelled');
  });
  const completed = finished.filter(o => o.status === 'Completed');
  const sum = (orders: Order[]) => orders.reduce((total, o) => total + o.totalAmount, 0);

  const productSales = new Map<number, { productId: number; name: string; quantity: number; revenue: number }>();
  for (const item of completed.flatMap(o => o.items)) {
    const row = productSales.get(item.productId) ?? { productId: item.productId, name: item.product?.name ?? 'Item', quantity: 0, revenue: 0 };
    row.quantity += item.quantity;
    row.revenue += item.quantity * item.unitPrice;
    productSales.set(item.productId, row);
  }
  const productRows = [...productSales.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));

  const body: OrderReport = {
    from,
    to,
    completedOrders: completed.length,
    cancelledOrders: finished.length - completed.length,
    revenue: sum(completed),
    itemsSold: productRows.reduce((total, p) => total + p.quantity, 0),
    byFulfillment: (['DineIn', 'Takeout', 'Delivery'] as FulfillmentType[]).map(type => ({
      fulfillmentType: type,
      completedOrders: completed.filter(o => o.fulfillmentType === type).length,
      cancelledOrders: finished.filter(o => o.status === 'Cancelled' && o.fulfillmentType === type).length,
      revenue: sum(completed.filter(o => o.fulfillmentType === type))
    })),
    days: dayList.map(date => {
      const onDay = finished.filter(o => localDate(new Date(o.orderDate + 'Z')) === date);
      const done = onDay.filter(o => o.status === 'Completed');
      return { date, completedOrders: done.length, cancelledOrders: onDay.length - done.length, revenue: sum(done) };
    }),
    products: productRows
  };
  return ok(body);
}

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
