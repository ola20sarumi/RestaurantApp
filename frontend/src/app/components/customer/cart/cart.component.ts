import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../../../services/cart.service';
import { CartLineComponent } from '../cart-line/cart-line.component';

@Component({
  selector: 'app-cart',
  imports: [CartLineComponent, CurrencyPipe, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent {
  readonly cart = inject(CartService);
}
