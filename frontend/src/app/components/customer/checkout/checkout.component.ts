import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CustomerDetails, Order } from '../../../models/restaurant.models';
import { CartService } from '../../../services/cart.service';
import { OrderService } from '../../../services/order.service';
import { PaymentService } from '../../../services/payment.service';
import { describeApiError } from '../../../services/api-error';
import { CheckoutFormComponent } from '../checkout-form/checkout-form.component';
import { OrderSummaryComponent } from '../order-summary/order-summary.component';

@Component({
  selector: 'app-checkout',
  imports: [CheckoutFormComponent, OrderSummaryComponent, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  /** Places the order with the details from the form; online orders then go to Paystack. */
  placeOrder(details: CustomerDetails): void {
    if (this.isSubmitting() || this.cart.items().length === 0) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    this.orderService.createOrder(this.cart.toOrderRequest(details)).subscribe({
      next: (order) => (order.paymentMethod === 'Online' ? this.payOnline(order) : this.showConfirmation(order)),
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, 'Could not place your order. Please try again.'));
        this.isSubmitting.set(false);
      }
    });
  }

  /** Pay-at-counter orders are done: the cart is emptied and the confirmation page shows the order. */
  private showConfirmation(order: Order): void {
    this.cart.clear();
    this.router.navigate(['/order', order.reference]);
  }

  /**
   * Sends the customer to Paystack. The cart is kept until the payment is confirmed (on the order page), so a customer
   * who gives up on Paystack can come back to it. If the payment can't be started, the order page offers a retry.
   */
  private payOnline(order: Order): void {
    this.paymentService.startPayment(order.reference).subscribe({
      next: (url) => this.document.location.assign(url),
      error: () => this.router.navigate(['/order', order.reference])
    });
  }
}
