import { CurrencyPipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CustomerDetails, FULFILLMENT_OPTIONS, FulfillmentType, Order, PaymentMethod } from '../../../models/restaurant.models';
import { CartService } from '../../../services/cart.service';
import { OrderService } from '../../../services/order.service';
import { PaymentService } from '../../../services/payment.service';
import { describeApiError } from '../../../services/api-error';

@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  readonly fulfillmentOptions = FULFILLMENT_OPTIONS;

  // Form fields (two-way bound with ngModel). The customer must pick an order type first.
  fulfillmentType: FulfillmentType | null = null;
  customerName = '';
  customerPhone = '';
  deliveryAddress = '';
  paymentMethod: PaymentMethod = 'Online';
  customerEmail = '';
  /** How an online payer identifies themselves to Paystack. */
  payerContact: 'Email' | 'Phone' = 'Email';

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  /** Eat-in orders only need a name; takeout and delivery also need a phone number. */
  get needsPhone(): boolean {
    return this.fulfillmentType === 'Takeout' || this.fulfillmentType === 'Delivery';
  }

  /** Online payers who choose "Phone" give a phone number instead of an email (eat-in asks for it in the payment step). */
  get paysByPhone(): boolean {
    return this.paysOnline && this.payerContact === 'Phone';
  }

  /** Delivery orders are always paid online; the others let the customer choose. */
  get paysOnline(): boolean {
    return this.fulfillmentType === 'Delivery' || this.paymentMethod === 'Online';
  }

  selectOrderType(type: FulfillmentType): void {
    this.fulfillmentType = type;
    this.error.set(null);
  }

  submitOrder(form: NgForm): void {
    // Field errors are shown in the template once the form has been submitted.
    // Hidden fields (e.g. the address for takeout) are removed from the form, so they don't block submitting.
    if (!this.fulfillmentType || form.invalid || this.isSubmitting() || this.cart.items().length === 0) return;

    const details: CustomerDetails = {
      fulfillmentType: this.fulfillmentType,
      customerName: this.customerName.trim(),
      customerPhone: this.needsPhone || this.paysByPhone ? this.customerPhone.trim() : undefined,
      deliveryAddress: this.fulfillmentType === 'Delivery' ? this.deliveryAddress.trim() : undefined,
      paymentMethod: this.paysOnline ? 'Online' : 'Counter',
      customerEmail: this.paysOnline && !this.paysByPhone ? this.customerEmail.trim() : undefined
    };

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
