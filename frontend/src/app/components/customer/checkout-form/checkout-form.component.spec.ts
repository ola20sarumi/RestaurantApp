import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerDetails, FulfillmentType } from '../../../models/restaurant.models';
import { provideNairaLocale } from '../../../../testing/naira-locale';
import { CheckoutFormComponent } from './checkout-form.component';

describe('CheckoutFormComponent', () => {
  let fixture: ComponentFixture<CheckoutFormComponent>;
  let element: HTMLElement;
  let placed: CustomerDetails[];

  /** Lets ngModel pick up the change, then re-renders. */
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function click(selector: string): Promise<void> {
    element.querySelector<HTMLElement>(selector)!.click();
    await settle();
  }

  async function fill(id: string, value: string): Promise<void> {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await settle();
  }

  const chooseType = (type: FulfillmentType) => click(`label[for="type-${type}"]`);
  const submit = () => click('button[type="submit"]');
  const has = (selector: string) => element.querySelector(selector) !== null;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CheckoutFormComponent], providers: [provideNairaLocale()] });
    fixture = TestBed.createComponent(CheckoutFormComponent);
    fixture.componentRef.setInput('total', 14500);
    element = fixture.nativeElement;
    placed = [];
    fixture.componentInstance.placeOrder.subscribe((details: CustomerDetails) => placed.push(details));
    await settle();
  });

  it('asks for the order type first and won\'t submit without one', async () => {
    expect(has('#customerName')).toBeFalse();

    await submit();

    expect(element.textContent).toContain("Please choose how you'd like your order.");
    expect(placed).toEqual([]);
  });

  it('asks eat-in customers for their name only', async () => {
    await chooseType('DineIn');

    expect(has('#customerName')).toBeTrue();
    expect(has('#customerPhone')).toBeFalse();
    expect(has('#deliveryAddress')).toBeFalse();
    expect(has('#pay-Counter')).toBeTrue();
  });

  it('asks takeout customers for a phone number but no address', async () => {
    await chooseType('Takeout');

    expect(has('#customerPhone')).toBeTrue();
    expect(has('#deliveryAddress')).toBeFalse();
  });

  it('asks delivery customers for a phone number and address, and only offers online payment', async () => {
    await chooseType('Delivery');

    expect(has('#customerPhone')).toBeTrue();
    expect(has('#deliveryAddress')).toBeTrue();
    expect(has('#pay-Counter')).toBeFalse();
    expect(element.textContent).toContain('Delivery orders are paid online');
    expect(element.querySelector('button[type="submit"]')?.textContent).toContain('Pay ₦14,500.00');
  });

  it('shows the missing phone and address errors for an empty delivery order', async () => {
    await chooseType('Delivery');
    await submit();

    expect(element.textContent).toContain('Please enter your name.');
    expect(element.textContent).toContain('Please enter your phone number.');
    expect(element.textContent).toContain('Please enter your delivery address.');
    expect(placed).toEqual([]);
  });

  it('emits the details a takeout order paid at the counter needs', async () => {
    await chooseType('Takeout');
    await fill('customerName', ' Ada Lovelace ');
    await fill('customerPhone', '0803 123 4567');
    await click('label[for="pay-Counter"]');
    await submit();

    expect(placed).toEqual([{
      fulfillmentType: 'Takeout',
      customerName: 'Ada Lovelace',
      customerPhone: '0803 123 4567',
      deliveryAddress: undefined,
      paymentMethod: 'Counter',
      customerEmail: undefined
    }]);
  });

  it('reports the order type the customer picks', async () => {
    const types: FulfillmentType[] = [];
    fixture.componentInstance.fulfillmentTypeChange.subscribe((type: FulfillmentType) => types.push(type));

    await chooseType('Takeout');

    expect(types).toEqual(['Takeout']);
  });

  it('disables the button while the order is being placed and shows the last error', async () => {
    fixture.componentRef.setInput('submitting', true);
    fixture.componentRef.setInput('error', 'Could not reach the restaurant.');
    await settle();

    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeTrue();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Could not reach the restaurant.');
  });
});
