import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Order } from '../../../models/restaurant.models';
import { CartService } from '../../../services/cart.service';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly placedOrder = signal<Order | null>(null);

  placeOrder(): void {
    if (this.submitting() || this.cart.items().length === 0) return;

    this.submitting.set(true);
    this.error.set(null);

    this.orderService.createOrder(this.cart.toOrderRequest()).subscribe({
      next: (order) => {
        this.placedOrder.set(order);
        this.cart.clear();
        this.submitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        // The API returns a plain message for unavailable products, or a validation problem object.
        const message = typeof err.error === 'string' ? err.error : 'Could not place your order. Please try again.';
        this.error.set(message);
        this.submitting.set(false);
      }
    });
  }
}
