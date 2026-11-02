import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CartItem } from '../../../models/restaurant.models';

/**
 * One row of the cart: the dish, a quantity stepper, the line total and a remove button. Used as
 * `<li appCartLine>` so the row stays a direct child of its `.list-group`. The cart page applies the changes.
 */
@Component({
  selector: 'li[appCartLine]',
  imports: [CurrencyPipe],
  templateUrl: './cart-line.component.html',
  styleUrl: './cart-line.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'list-group-item cart-row' }
})
export class CartLineComponent {
  readonly item = input.required<CartItem>();

  /** The new quantity; 0 means the customer stepped it down to nothing. */
  readonly quantityChange = output<number>();
  readonly remove = output<void>();
}
