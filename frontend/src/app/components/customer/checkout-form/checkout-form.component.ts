import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { CustomerDetails, FULFILLMENT_OPTIONS, FulfillmentType, PaymentMethod } from '../../../models/restaurant.models';

/**
 * The checkout form: order type, the customer details that type needs, and how to pay. It only collects and
 * validates; the checkout page places the order with what `placeOrder` emits.
 */
@Component({
  selector: 'app-checkout-form',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './checkout-form.component.html',
  styleUrl: './checkout-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutFormComponent {
  /** Cart total, shown on the "Pay" button. */
  readonly total = input.required<number>();
  /** True while the page is placing the order; disables the submit button. */
  readonly submitting = input(false);
  /** Message from the last failed attempt, shown above the submit button. */
  readonly error = input<string | null>(null);

  /** Valid details, ready for POST /api/orders (without the items). */
  readonly placeOrder = output<CustomerDetails>();
  readonly fulfillmentTypeChange = output<FulfillmentType>();

  readonly fulfillmentOptions = FULFILLMENT_OPTIONS;

  // Form fields (two-way bound with ngModel). The customer must pick an order type first.
  fulfillmentType: FulfillmentType | null = null;
  customerName = '';
  customerPhone = '';
  deliveryAddress = '';
  paymentMethod: PaymentMethod = 'Online';
  customerEmail = '';
  /** How an online payer identifies themselves to Paystack. */
  payerContact: 'Email' | 'Phone' = 'Email';

  /** Eat-in orders only need a name; takeout and delivery also need a phone number. */
  get needsPhone(): boolean {
    return this.fulfillmentType === 'Takeout' || this.fulfillmentType === 'Delivery';
  }

  /** Online payers who choose "Phone" give a phone number instead of an email (eat-in asks for it in the payment step). */
  get paysByPhone(): boolean {
    return this.paysOnline && this.payerContact === 'Phone';
  }

  /** Delivery orders are always paid online; the others let the customer choose. */
  get paysOnline(): boolean {
    return this.fulfillmentType === 'Delivery' || this.paymentMethod === 'Online';
  }

  selectOrderType(type: FulfillmentType): void {
    this.fulfillmentType = type;
    this.fulfillmentTypeChange.emit(type);
  }

  submit(form: NgForm): void {
    // Field errors are shown in the template once the form has been submitted.
    // Hidden fields (e.g. the address for takeout) are removed from the form, so they don't block submitting.
    if (!this.fulfillmentType || form.invalid || this.submitting()) return;

    this.placeOrder.emit({
      fulfillmentType: this.fulfillmentType,
      customerName: this.customerName.trim(),
      customerPhone: this.needsPhone || this.paysByPhone ? this.customerPhone.trim() : undefined,
      deliveryAddress: this.fulfillmentType === 'Delivery' ? this.deliveryAddress.trim() : undefined,
      paymentMethod: this.paysOnline ? 'Online' : 'Counter',
      customerEmail: this.paysOnline && !this.paysByPhone ? this.customerEmail.trim() : undefined
    });
  }
}
