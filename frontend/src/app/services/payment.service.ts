import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { OrderTracking } from '../models/restaurant.models';

/** Paystack online payment. The API talks to Paystack; the browser only gets sent to Paystack's checkout page. */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/payments`;

  /** Starts (or retries) paying for an online order and returns the Paystack checkout URL. */
  startPayment(orderReference: string): Observable<string> {
    return this.http
      .post<{ authorizationUrl: string }>(`${this.url}/${encodeURIComponent(orderReference)}/initialize`, null)
      .pipe(map(response => response.authorizationUrl));
  }

  /** Has the API check the payment with Paystack; `trxref` is what Paystack adds to the return URL. */
  verifyPayment(orderReference: string, trxref?: string): Observable<OrderTracking> {
    const params = trxref ? new HttpParams().set('trxref', trxref) : undefined;
    return this.http.post<OrderTracking>(`${this.url}/${encodeURIComponent(orderReference)}/verify`, null, { params });
  }
}
