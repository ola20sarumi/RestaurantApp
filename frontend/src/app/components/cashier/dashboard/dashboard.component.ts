import { Component, OnInit, inject, signal } from '@angular/core';

import { ORDER_STATUSES, Order, OrderStatus } from '../../../models/restaurant.models';
import { OrderService } from '../../../services/order.service';
import { OrderCardComponent } from '../order-card/order-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [OrderCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly statuses = ORDER_STATUSES;
  readonly orders = signal<Order[]>([]);
  readonly statusFilter = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderService.getOrders(this.statusFilter() || undefined).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load orders. Is the API running on http://localhost:5044?');
        this.loading.set(false);
      }
    });
  }

  filterBy(status: string): void {
    this.statusFilter.set(status);
    this.loadOrders();
  }

  markPaid(order: Order): void {
    this.orderService.markPaid(order.id).subscribe({
      next: () => this.loadOrders(),
      error: () => this.error.set(`Could not mark order #${order.id} as paid.`)
    });
  }

  setStatus(order: Order, status: OrderStatus): void {
    this.orderService.updateOrderStatus(order.id, status).subscribe({
      next: () => this.loadOrders(),
      error: () => this.error.set(`Could not update order #${order.id}.`)
    });
  }
}
