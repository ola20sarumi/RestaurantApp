import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CartItem } from '../../../models/restaurant.models';

/**
 * The itemised "receipt" next to the checkout form: one line per dish and the total. Content placed inside the
 * element (a note, an "Edit cart" link) goes at the bottom of the card.
 */
@Component({
  selector: 'app-order-summary',
  imports: [CurrencyPipe],
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-block' }
})
export class OrderSummaryComponent {
  readonly items = input.required<CartItem[]>();
  readonly total = input.required<number>();
}
