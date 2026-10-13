import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Category, CategoryRequest, Product, ProductRequest } from '../../../models/restaurant.models';
import { describeApiError } from '../../../services/api-error';
import { ProductService } from '../../../services/product.service';

/** Form state: `id` is null while adding; price is null until the field is filled in. */
type ProductDraft = Omit<ProductRequest, 'price'> & { id: number | null; price: number | null };
type CategoryDraft = CategoryRequest & { id: number | null };

@Component({
  selector: 'app-menu-admin',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './menu-admin.component.html',
  styleUrl: './menu-admin.component.css'
})
export class MenuAdminComponent implements OnInit {
  private readonly productService = inject(ProductService);

  readonly tab = signal<'products' | 'categories'>('products');
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  /** Id of the product/category whose row action (toggle, delete) is in flight. */
  readonly busyId = signal<number | null>(null);
  readonly saving = signal(false);

  readonly productDraft = signal<ProductDraft | null>(null);
  readonly categoryDraft = signal<CategoryDraft | null>(null);

  readonly search = signal('');
  readonly categoryFilter = signal(0); // 0 = all categories

  readonly categoryNames = computed(() => new Map(this.categories().map(c => [c.id, c.name])));
  readonly productCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const p of this.products()) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return counts;
  });
  readonly filteredProducts = computed(() => {
    const term = this.search().trim().toLowerCase();
    const categoryId = this.categoryFilter();
    return this.products().filter(p =>
      (!categoryId || p.categoryId === categoryId) &&
      (!term || p.name.toLowerCase().includes(term) || (p.description ?? '').toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      products: this.productService.getProducts(true),
      categories: this.productService.getCategories()
    }).subscribe({
      next: ({ products, categories }) => {
        this.products.set(products);
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the menu. Is the API running on http://localhost:5044?');
        this.loading.set(false);
      }
    });
  }

  selectTab(tab: 'products' | 'categories'): void {
    this.tab.set(tab);
    this.clearMessages();
  }

  // ---- Products ----

  newProduct(): void {
    this.clearMessages();
    this.productDraft.set({
      id: null,
      name: '',
      description: '',
      price: null,
      imageUrl: '',
      isAvailable: true,
      categoryId: this.categoryFilter() || this.categories()[0]?.id || 0
    });
  }

  editProduct(product: Product): void {
    this.clearMessages();
    this.productDraft.set({
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      imageUrl: product.imageUrl ?? '',
      isAvailable: product.isAvailable,
      categoryId: product.categoryId
    });
  }

  saveProduct(form: NgForm): void {
    const draft = this.productDraft();
    if (!draft || form.invalid || this.saving()) return;

    const { id, ...request } = draft;
    const body: ProductRequest = { ...request, price: request.price ?? 0 };
    const save$ = id === null
      ? this.productService.createProduct(body)
      : this.productService.updateProduct(id, body);

    this.saving.set(true);
    this.clearMessages();
    save$.subscribe({
      next: (saved) => {
        this.upsertProduct(saved);
        this.productDraft.set(null);
        this.saving.set(false);
        this.notice.set(`${id === null ? 'Added' : 'Saved'} "${saved.name}".`);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, 'Could not save the product.'));
        this.saving.set(false);
      }
    });
  }

  /** Flips "available on the menu" straight from the table. */
  toggleAvailable(product: Product): void {
    this.busyId.set(product.id);
    this.clearMessages();
    this.productService.updateProduct(product.id, { ...this.toRequest(product), isAvailable: !product.isAvailable }).subscribe({
      next: (saved) => {
        this.upsertProduct(saved);
        this.busyId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, `Could not update "${product.name}".`));
        this.busyId.set(null);
      }
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Delete "${product.name}" from the menu? This can't be undone.`)) return;

    this.busyId.set(product.id);
    this.clearMessages();
    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.products.update(list => list.filter(p => p.id !== product.id));
        if (this.productDraft()?.id === product.id) this.productDraft.set(null);
        this.busyId.set(null);
        this.notice.set(`Deleted "${product.name}".`);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, `Could not delete "${product.name}".`));
        this.busyId.set(null);
      }
    });
  }

  // ---- Categories ----

  newCategory(): void {
    this.clearMessages();
    this.categoryDraft.set({ id: null, name: '', description: '' });
  }

  editCategory(category: Category): void {
    this.clearMessages();
    this.categoryDraft.set({ id: category.id, name: category.name, description: category.description ?? '' });
  }

  saveCategory(form: NgForm): void {
    const draft = this.categoryDraft();
    if (!draft || form.invalid || this.saving()) return;

    const { id, ...request } = draft;
    const save$ = id === null
      ? this.productService.createCategory(request)
      : this.productService.updateCategory(id, request);

    this.saving.set(true);
    this.clearMessages();
    save$.subscribe({
      next: (saved) => {
        this.categories.update(list =>
          [...list.filter(c => c.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
        this.categoryDraft.set(null);
        this.saving.set(false);
        this.notice.set(`${id === null ? 'Added' : 'Saved'} category "${saved.name}".`);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, 'Could not save the category.'));
        this.saving.set(false);
      }
    });
  }

  deleteCategory(category: Category): void {
    if (!confirm(`Delete the "${category.name}" category?`)) return;

    this.busyId.set(category.id);
    this.clearMessages();
    this.productService.deleteCategory(category.id).subscribe({
      next: () => {
        this.categories.update(list => list.filter(c => c.id !== category.id));
        if (this.categoryDraft()?.id === category.id) this.categoryDraft.set(null);
        if (this.categoryFilter() === category.id) this.categoryFilter.set(0);
        this.busyId.set(null);
        this.notice.set(`Deleted category "${category.name}".`);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, `Could not delete "${category.name}".`));
        this.busyId.set(null);
      }
    });
  }

  private toRequest(product: Product): ProductRequest {
    return {
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      isAvailable: product.isAvailable,
      categoryId: product.categoryId
    };
  }

  private upsertProduct(saved: Product): void {
    this.products.update(list =>
      [...list.filter(p => p.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
  }

  private clearMessages(): void {
    this.error.set(null);
    this.notice.set(null);
  }
}
