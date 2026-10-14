import { CurrencyPipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FULFILLMENT_OPTIONS, OrderTracking } from '../../../models/restaurant.models';
import { CartService } from '../../../services/cart.service';
import { PaymentService } from '../../../services/payment.service';
import { describeApiError } from '../../../services/api-error';

/**
 * The customer's order page (/order/:orderRef). Checkout sends pay-at-counter orders here, and Paystack sends
 * customers back here after paying (adding ?trxref=...). The API checks the payment with Paystack before saying
 * it's paid; an unpaid online order gets a "Pay now" button to try again.
 */
@Component({
  selector: 'app-order-status',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './order-status.component.html',
  styleUrl: './order-status.component.css'
})
export class OrderStatusComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  /** The order's reference, from the route. */
  readonly orderRef = input.required<string>();
  /** Paystack's transaction reference, added to the URL when Paystack sends the customer back. */
  readonly trxref = input<string>();

  readonly order = signal<OrderTracking | null>(null);
  readonly loading = signal(true);
  readonly checking = signal(false);
  readonly paying = signal(false);
  readonly error = signal<string | null>(null);

  readonly fulfillmentOption = computed(() => FULFILLMENT_OPTIONS.find(o => o.value === this.order()?.fulfillmentType));
  /** Online orders aren't sent to the kitchen until they are paid. */
  readonly awaitingPayment = computed(() => {
    const order = this.order();
    return order?.paymentMethod === 'Online' && order.paymentStatus === 'Unpaid';
  });

  ngOnInit(): void {
    this.refresh();
  }

  /** Loads the order; for an unpaid online order the API first asks Paystack whether it has been paid. */
  refresh(): void {
    this.checking.set(true);
    this.error.set(null);
    const returnedFromPaystack = !!this.trxref();
    this.paymentService.verifyPayment(this.orderRef(), this.trxref()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
        this.checking.set(false);
        if (returnedFromPaystack) {
          // Paid: the cart has been ordered. Either way, drop ?trxref so a reload doesn't repeat this.
          if (order.paymentStatus === 'Paid') this.cart.clear();
          this.router.navigate(['/order', order.reference], { replaceUrl: true });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 404
          ? "We couldn't find that order. Please check the link."
          : describeApiError(err, 'Could not load your order. Please try again.'));
        this.loading.set(false);
        this.checking.set(false);
      }
    });
  }

  /** Sends the customer (back) to Paystack to pay for this order. */
  pay(): void {
    this.paying.set(true);
    this.error.set(null);
    this.paymentService.startPayment(this.orderRef()).subscribe({
      next: (url) => this.document.location.assign(url),
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, 'Could not start the payment. Please try again.'));
        this.paying.set(false);
      }
    });
  }
}
