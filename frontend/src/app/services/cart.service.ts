import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

import { CartItem, CreateOrderRequest, Product } from '../models/restaurant.models';

const STORAGE_KEY = 'restaurant-cart';

/** Customer's cart, shared by the menu, cart and checkout pages. Saved in localStorage in the browser. */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _items = signal<CartItem[]>(this.load());

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().reduce((sum, i) => sum + i.quantity, 0));
  readonly total = computed(() => this._items().reduce((sum, i) => sum + i.product.price * i.quantity, 0));

  constructor() {
    effect(() => this.save(this._items()));
  }

  add(product: Product): void {
    const existing = this._items().find(i => i.product.id === product.id);
    if (existing) {
      this.setQuantity(product.id, existing.quantity + 1);
    } else {
      this._items.update(items => [...items, { product, quantity: 1 }]);
    }
  }

  /** Sets the quantity; 0 or less removes the item. */
  setQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this._items.update(items => items.map(i => (i.product.id === productId ? { ...i, quantity } : i)));
  }

  remove(productId: number): void {
    this._items.update(items => items.filter(i => i.product.id !== productId));
  }

  clear(): void {
    this._items.set([]);
  }

  toOrderRequest(): CreateOrderRequest {
    return { items: this._items().map(i => ({ productId: i.product.id, quantity: i.quantity })) };
  }

  private load(): CartItem[] {
    if (!this.isBrowser) return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private save(items: CartItem[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable (e.g. private mode) — the cart still works for this visit.
    }
  }
}
