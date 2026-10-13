import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { Product, Category, CategoryRequest, ProductRequest } from '../models/restaurant.models';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly http = inject(HttpClient);

  /** Products with their category loaded; available ones only unless `includeUnavailable` (admin page). */
  getProducts(includeUnavailable = false): Observable<Product[]> {
    const params = includeUnavailable ? new HttpParams().set('includeUnavailable', true) : undefined;
    return this.http.get<Product[]>(`${API_BASE_URL}/products`, { params });
  }

  createProduct(request: ProductRequest): Observable<Product> {
    return this.http.post<Product>(`${API_BASE_URL}/products`, request);
  }

  updateProduct(id: number, request: ProductRequest): Observable<Product> {
    return this.http.put<Product>(`${API_BASE_URL}/products/${id}`, request);
  }

  /** Fails with 409 if the product appears in past orders; mark it unavailable instead. */
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/products/${id}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${API_BASE_URL}/categories`);
  }

  createCategory(request: CategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${API_BASE_URL}/categories`, request);
  }

  updateCategory(id: number, request: CategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${API_BASE_URL}/categories/${id}`, request);
  }

  /** Fails with 409 if the category still has products. */
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/categories/${id}`);
  }
}
