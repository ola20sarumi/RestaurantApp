import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Product } from '../../../models/restaurant.models';

/** One dish on the menu, with its "Add" button. The menu page owns the cart; this only reports clicks. */
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  /** How many are already in the cart; shown on the button when more than 0. */
  readonly quantityInCart = input(0);
  /** Staggers the cards' entrance animation (ms). */
  readonly animationDelay = input(0);

  readonly add = output<Product>();
}
