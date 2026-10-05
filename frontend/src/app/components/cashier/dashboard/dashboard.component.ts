import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { ORDER_STATUSES, Order } from '../../../models/restaurant.models';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe],
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

  badgeClass(status: string): string {
    switch (status) {
      case 'Pending': return 'text-bg-warning';
      case 'Preparing': return 'text-bg-info';
      case 'Ready': return 'text-bg-success';
      case 'Cancelled': return 'text-bg-danger';
      default: return 'text-bg-secondary';
    }
  }

  setStatus(order: Order, status: string): void {
    this.orderService.updateOrderStatus(order.id, status).subscribe({
      next: () => this.loadOrders(),
      error: () => this.error.set(`Could not update order #${order.id}.`)
    });
  }
}
