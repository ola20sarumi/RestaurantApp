import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { CartService } from '../../../services/cart.service';
import { ProductService } from '../../../services/product.service';
import { Category, Product } from '../../../models/restaurant.models';

@Component({
  selector: 'app-menu',
  imports: [CurrencyPipe],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css',
})
export class MenuComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly cart = inject(CartService);

  readonly products = signal<Product[]>([]);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Categories that have at least one available product, in the order they first appear. */
  readonly categories = computed<Category[]>(() => {
    const byId = new Map<number, Category>();
    for (const product of this.products()) {
      if (product.category && !byId.has(product.categoryId)) {
        byId.set(product.categoryId, product.category);
      }
    }
    return [...byId.values()];
  });

  readonly filteredProducts = computed(() => {
    const categoryId = this.selectedCategoryId();
    return categoryId === null ? this.products() : this.products().filter(p => p.categoryId === categoryId);
  });

  ngOnInit(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the menu. Is the API running on http://localhost:5044?');
        this.loading.set(false);
      },
    });
  }

  filterByCategory(categoryId: number | null): void {
    this.selectedCategoryId.set(categoryId);
  }

  addToCart(product: Product): void {
    this.cart.add(product);
  }

  /** How many of this product are already in the cart (0 if none). */
  quantityInCart(productId: number): number {
    return this.cart.items().find(i => i.product.id === productId)?.quantity ?? 0;
  }
}
