import { type Meta, type StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';

import { cartItem } from '../../../../stories/demo-fixtures';
import { CartLineComponent } from './cart-line.component';

const meta: Meta<CartLineComponent> = {
  title: 'Customer/CartLine',
  component: CartLineComponent,
  // Rendered the way the cart page uses it: an <li> inside the cart's list group.
  render: args => ({
    props: args,
    template: `
      <div class="card border-0" style="max-width: 760px">
        <ul class="list-group list-group-flush">
          <li appCartLine [item]="item" (quantityChange)="quantityChange($event)" (remove)="remove()"></li>
        </ul>
      </div>`
  }),
  args: {
    item: cartItem('Buffalo Chicken Wings', 1),
    quantityChange: fn(),
    remove: fn()
  }
};

export default meta;
type Story = StoryObj<CartLineComponent>;

export const SingleItem: Story = {};

export const SeveralOfOneDish: Story = {
  args: { item: cartItem('Classic Cheeseburger', 4) }
};

export const NoPhoto: Story = {
  args: { item: { ...cartItem('Fresh Iced Lemonade', 2), product: { ...cartItem('Fresh Iced Lemonade', 2).product, imageUrl: null } } }
};
