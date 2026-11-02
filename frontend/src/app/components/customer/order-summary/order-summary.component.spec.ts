import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CartItem } from '../../../models/restaurant.models';
import { provideNairaLocale } from '../../../../testing/naira-locale';
import { OrderSummaryComponent } from './order-summary.component';

const items: CartItem[] = [
  {
    quantity: 2,
    product: { id: 4, name: 'Classic Cheeseburger', description: null, price: 6500, imageUrl: 'burger.jpg', isAvailable: true, categoryId: 2, category: null }
  },
  {
    quantity: 1,
    product: { id: 10, name: 'Fresh Iced Lemonade', description: null, price: 1500, imageUrl: null, isAvailable: true, categoryId: 3, category: null }
  }
];

@Component({
  imports: [OrderSummaryComponent],
  template: `<app-order-summary [items]="items" [total]="14500"><a class="edit-link" href="/cart">Edit cart</a></app-order-summary>`
})
class HostComponent {
  readonly items = items;
}

describe('OrderSummaryComponent', () => {
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNairaLocale()] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it('lists each dish with its quantity, unit price and line total', () => {
    const lines = element.querySelectorAll('.list-group-item');

    expect(lines.length).toBe(2);
    expect(lines[0].textContent).toContain('Classic Cheeseburger');
    expect(lines[0].textContent).toContain('Qty: 2 × ₦6,500.00');
    expect(lines[0].querySelector('.fw-bold')?.textContent?.trim()).toBe('₦13,000.00');
    expect(lines[1].querySelector('img')).toBeNull();
    expect(lines[1].querySelector('.dish-thumb .bi-egg-fried')).not.toBeNull();
  });

  it('shows the total it is given', () => {
    expect(element.querySelector('.receipt-total .amount')?.textContent?.trim()).toBe('₦14,500.00');
  });

  it('shows content placed inside it at the bottom of the card', () => {
    const card = element.querySelector('.card.receipt')!;

    expect(card.lastElementChild?.classList).toContain('edit-link');
  });
});
