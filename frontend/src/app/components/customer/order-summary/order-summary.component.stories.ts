import { type Meta, type StoryObj } from '@storybook/angular';

import { CartItem } from '../../../models/restaurant.models';
import { cartItem } from '../../../../stories/demo-fixtures';
import { OrderSummaryComponent } from './order-summary.component';

const totalOf = (items: CartItem[]) => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

const single = [cartItem('Margherita Pizza', 1)];
const many = [
  cartItem('Crispy Mozzarella Sticks', 2),
  cartItem('Classic Cheeseburger', 1),
  cartItem('Grilled Salmon Bowl', 1),
  cartItem('Fettuccine Alfredo', 3),
  cartItem('Chocolate Lava Cake', 2),
  cartItem('Fresh Iced Lemonade', 4)
];

const meta: Meta<OrderSummaryComponent> = {
  title: 'Customer/OrderSummary',
  component: OrderSummaryComponent,
  // With the note and link the checkout page puts inside it.
  render: args => ({
    props: args,
    template: `
      <app-order-summary style="max-width: 420px" [items]="items" [total]="total">
        <div class="receipt-note"><i class="bi bi-shield-check"></i>Secure payment with Paystack, or pay at the counter.</div>
        <a href="#" class="btn btn-link px-0 mt-2 align-self-start"><i class="bi bi-arrow-left me-1"></i>Edit cart</a>
      </app-order-summary>`
  }),
  args: { items: single, total: totalOf(single) }
};

export default meta;
type Story = StoryObj<OrderSummaryComponent>;

export const SingleItem: Story = {};

export const ManyItems: Story = {
  args: { items: many, total: totalOf(many) }
};
