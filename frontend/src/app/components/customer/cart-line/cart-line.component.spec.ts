import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CartItem } from '../../../models/restaurant.models';
import { provideNairaLocale } from '../../../../testing/naira-locale';
import { CartLineComponent } from './cart-line.component';

const twoPizzas: CartItem = {
  quantity: 2,
  product: {
    id: 5, name: 'Margherita Pizza', description: null, price: 8000, imageUrl: null,
    isAvailable: true, categoryId: 2, category: null
  }
};

/** Uses the row the way the cart page does, inside a list. */
@Component({
  imports: [CartLineComponent],
  template: `
    <ul class="list-group">
      <li appCartLine [item]="item" (quantityChange)="quantities.push($event)" (remove)="removed = removed + 1"></li>
    </ul>`
})
class HostComponent {
  readonly item = twoPizzas;
  readonly quantities: number[] = [];
  removed = 0;
}

describe('CartLineComponent', () => {
  let host: HostComponent;
  let row: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNairaLocale()] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    row = fixture.nativeElement.querySelector('ul > li');
  });

  it('is a list-group row of its own', () => {
    expect(row.classList).toContain('list-group-item');
    expect(row.classList).toContain('cart-row');
  });

  it('shows the dish, its unit price, the quantity and the line total', () => {
    expect(row.querySelector('.dish-name')?.textContent?.trim()).toBe('Margherita Pizza');
    expect(row.textContent).toContain('₦8,000.00 each');
    expect(row.querySelector('.input-group-text')?.textContent?.trim()).toBe('2');
    expect(row.querySelector('.subtotal')?.textContent?.trim()).toBe('₦16,000.00');
  });

  it('emits the new quantity from the stepper buttons', () => {
    row.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]')!.click();
    row.querySelector<HTMLButtonElement>('[aria-label="Decrease quantity"]')!.click();

    expect(host.quantities).toEqual([3, 1]);
  });

  it('emits remove from the button labelled with the dish name', () => {
    row.querySelector<HTMLButtonElement>('[aria-label="Remove Margherita Pizza"]')!.click();

    expect(host.removed).toBe(1);
  });
});
