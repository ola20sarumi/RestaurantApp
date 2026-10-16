import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { OrderTracking } from '../app/models/restaurant.models';
import { PaymentService } from '../app/services/payment.service';

/**
 * Demo build only: stands in for Paystack's checkout page. Paying or cancelling sends the customer back to the
 * order page with a trxref, the way Paystack does, and the demo backend marks the order paid on "-success".
 */
@Component({
  selector: 'app-demo-pay',
  imports: [CurrencyPipe],
  template: `
    <div class="card border-0 shadow-sm mx-auto demo-pay">
      <div class="card-body p-4 p-md-5 text-center">
        <span class="badge text-bg-warning mb-3">Demo payment page</span>
        <h1 class="h4 fw-bold">Pay for your order</h1>
        <p class="text-body-secondary">
          In the live app, this is Paystack's secure checkout, where customers pay by card, bank transfer or USSD.
          No money changes hands in this demo.
        </p>
        @if (order(); as o) {
          <div class="display-6 fw-bold my-3">{{ o.totalAmount | currency }}</div>
          <p class="small text-body-secondary mb-4">Order #{{ o.id }} for {{ o.customerName }}</p>
        }
        <div class="d-flex flex-wrap justify-content-center gap-2">
          <button type="button" class="btn btn-success btn-lg" (click)="finish('success')">
            <i class="bi bi-check-lg me-1"></i>Pay
          </button>
          <button type="button" class="btn btn-outline-secondary btn-lg" (click)="finish('cancelled')">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: '.demo-pay { max-width: 32rem; }'
})
export class DemoPayComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);
  private readonly router = inject(Router);

  readonly orderRef = input.required<string>();
  readonly order = signal<OrderTracking | null>(null);

  ngOnInit(): void {
    this.paymentService.verifyPayment(this.orderRef()).subscribe(order => this.order.set(order));
  }

  finish(outcome: 'success' | 'cancelled'): void {
    this.router.navigate(['/order', this.orderRef()], { queryParams: { trxref: `${this.orderRef()}-${outcome}` } });
  }
}
