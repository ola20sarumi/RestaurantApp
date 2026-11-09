import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { FULFILLMENT_OPTIONS, ORDER_STATUSES, Order, OrderStatus } from '../../../models/restaurant.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/**
 * One order on the cashier dashboard: customer, items, total, payment and a button per status.
 * The dashboard sends the changes to the API and reloads.
 */
@Component({
  selector: 'app-order-card',
  imports: [CurrencyPipe, DatePipe, StatusBadgeComponent],
  templateUrl: './order-card.component.html',
  styleUrl: './order-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The card's colours follow the status (see the CSS), so each order stands out from its neighbours.
  host: { '[attr.data-status]': 'order().status' }
})
export class OrderCardComponent {
  readonly order = input.required<Order>();

  /** The status the cashier clicked (never the current one: its button is disabled). */
  readonly statusChange = output<OrderStatus>();
  /** The cashier took payment for an unpaid counter order. */
  readonly markPaid = output<void>();

  readonly statuses = ORDER_STATUSES;
  readonly fulfillmentOption = computed(() => FULFILLMENT_OPTIONS.find(o => o.value === this.order().fulfillmentType));
}
