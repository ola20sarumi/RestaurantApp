import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Order, OrderStatus } from '../../../models/restaurant.models';
import { provideNairaLocale } from '../../../../testing/naira-locale';
import { OrderCardComponent } from './order-card.component';

const delivery: Order = {
  id: 42,
  reference: '0123456789abcdef0123456789abcdef',
  orderDate: '2026-03-14T12:05:00',
  totalAmount: 15500,
  status: 'Preparing',
  customerName: 'Ngozi Obi',
  customerPhone: '0803 555 1042',
  customerEmail: 'ngozi@example.com',
  fulfillmentType: 'Delivery',
  deliveryAddress: '4 Awolowo Road, Ikoyi',
  paymentMethod: 'Online',
  paymentStatus: 'Paid',
  paidAt: '2026-03-14T12:06:00Z',
  paystackReference: 'demo',
  items: [
    { id: 1, quantity: 1, unitPrice: 12000, orderId: 42, productId: 7, product: null },
    { id: 2, quantity: 1, unitPrice: 3500, orderId: 42, productId: 8, product: { id: 8, name: 'Chocolate Lava Cake', description: null, price: 3500, imageUrl: null, isAvailable: true, categoryId: 3, category: null } }
  ]
};

const unpaidEatIn: Order = {
  ...delivery,
  id: 43,
  status: 'Pending',
  customerName: '',
  customerPhone: '',
  customerEmail: null,
  fulfillmentType: 'DineIn',
  deliveryAddress: null,
  paymentMethod: 'Counter',
  paymentStatus: 'Unpaid',
  paidAt: null,
  paystackReference: null
};

describe('OrderCardComponent', () => {
  let fixture: ComponentFixture<OrderCardComponent>;
  let element: HTMLElement;

  function render(order: Order): void {
    fixture.componentRef.setInput('order', order);
    fixture.detectChanges();
  }

  function button(name: string): HTMLButtonElement {
    const found = Array.from(element.querySelectorAll('button')).find(b => b.textContent?.trim() === name);
    if (!found) throw new Error(`No "${name}" button`);
    return found;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderCardComponent], providers: [provideNairaLocale()] });
    fixture = TestBed.createComponent(OrderCardComponent);
    element = fixture.nativeElement;
  });

  it('shows the order number, status, customer, contact details, items and total', () => {
    render(delivery);

    expect(element.querySelector('.card-header .fw-bold')?.textContent).toBe('#42');
    expect(element.querySelector('.card-header .badge.rounded-pill')?.textContent?.trim()).toBe('Preparing');
    expect(element.textContent).toContain('Ngozi Obi');
    expect(element.textContent).toContain('Delivery');
    expect(element.querySelector('a[href="tel:0803 555 1042"]')).not.toBeNull();
    expect(element.textContent).toContain('4 Awolowo Road, Ikoyi');
    expect(element.textContent).toContain('Product #7');
    expect(element.textContent).toContain('Chocolate Lava Cake');
    expect(element.textContent).toContain('₦15,500.00');
  });

  it('shows how a paid order was paid, with no "Mark as paid" button', () => {
    render(delivery);
    expect(element.querySelector('.payment-badge')?.textContent?.trim()).toBe('Paid online');

    render({ ...delivery, paymentMethod: 'Counter' });
    expect(element.querySelector('.payment-badge')?.textContent?.trim()).toBe('Paid at counter');
    expect(element.textContent).not.toContain('Mark as paid');
  });

  it('names an anonymous eat-in guest and emits markPaid for an unpaid counter order', () => {
    render(unpaidEatIn);
    let marked = 0;
    fixture.componentInstance.markPaid.subscribe(() => marked++);

    expect(element.textContent).toContain('Eat-in guest');
    expect(element.querySelector('.payment-badge')?.textContent?.trim()).toBe('Unpaid · pay at counter');
    button('Mark as paid').click();

    expect(marked).toBe(1);
  });

  it('disables the current status and emits the status clicked', () => {
    render(delivery);
    const changes: OrderStatus[] = [];
    fixture.componentInstance.statusChange.subscribe((status: OrderStatus) => changes.push(status));

    expect(button('Preparing').disabled).toBeTrue();
    button('Preparing').click();
    button('Ready').click();

    expect(changes).toEqual(['Ready']);
  });
});
