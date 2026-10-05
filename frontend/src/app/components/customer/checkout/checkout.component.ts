import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CustomerDetails, FULFILLMENT_OPTIONS, FulfillmentType, Order } from '../../../models/restaurant.models';
import { CartService } from '../../../services/cart.service';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);

  readonly fulfillmentOptions = FULFILLMENT_OPTIONS;

  // Form fields (two-way bound with ngModel). The customer must pick an order type first.
  fulfillmentType: FulfillmentType | null = null;
  customerName = '';
  customerPhone = '';
  deliveryAddress = '';

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly placedOrder = signal<Order | null>(null);
  /** Label and icon for the placed order's type, shown on the confirmation. */
  readonly placedOrderOption = computed(() =>
    FULFILLMENT_OPTIONS.find(o => o.value === this.placedOrder()?.fulfillmentType)
  );

  /** Eat-in orders only need a name; takeout and delivery also need a phone number. */
  get needsPhone(): boolean {
    return this.fulfillmentType === 'Takeout' || this.fulfillmentType === 'Delivery';
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
      customerPhone: this.needsPhone ? this.customerPhone.trim() : undefined,
      deliveryAddress: this.fulfillmentType === 'Delivery' ? this.deliveryAddress.trim() : undefined
    };

    this.isSubmitting.set(true);
    this.error.set(null);

    this.orderService.createOrder(this.cart.toOrderRequest(details)).subscribe({
      next: (order) => {
        this.placedOrder.set(order);
        this.cart.clear();
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.describeError(err));
        this.isSubmitting.set(false);
      }
    });
  }

  /** Turns an API error into a message for the customer. */
  private describeError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Could not reach the restaurant. Please check your connection and try again.';
    }
    if (typeof err.error === 'string') {
      return err.error; // e.g. "Products not found or unavailable: 3"
    }
    const fieldErrors = err.error?.errors as Record<string, string[]> | undefined;
    if (fieldErrors) {
      return Object.values(fieldErrors).flat().join(' ');
    }
    return 'Could not place your order. Please try again.';
  }
}
