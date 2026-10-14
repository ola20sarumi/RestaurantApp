import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { CreateOrderRequest, Order, OrderReport } from '../models/restaurant.models';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/orders`;

  /** All orders, newest first; optionally filtered by status (e.g. "Pending"). */
  getOrders(status?: string): Observable<Order[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<Order[]>(this.url, { params });
  }

  /** Sales report (admins only) for orders placed from `from` to `to` (yyyy-MM-dd, inclusive) in the browser's time zone. */
  getReport(from: string, to: string): Observable<OrderReport> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone);
    return this.http.get<OrderReport>(`${this.url}/report`, { params });
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.url}/${id}`);
  }

  /** Cashier: record that a pay-at-counter order has been paid. */
  markPaid(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/mark-paid`, null);
  }

  /** The API sets prices, total, orderDate and status ("Pending") itself. */
  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.url, request);
  }

  updateOrderStatus(id: number, status: string): Observable<void> {
    // The endpoint expects a JSON string body, e.g. "Completed".
    return this.http.put<void>(`${this.url}/${id}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
