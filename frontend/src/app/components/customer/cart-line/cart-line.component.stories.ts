import { type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

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
  // Outputs are actions: the fn() spies below record what the component emits (shown in the Actions panel).
  argTypes: { quantityChange: { action: 'quantityChange' }, remove: { action: 'remove' } },
  args: {
    item: cartItem('Buffalo Chicken Wings', 1),
    quantityChange: fn(),
    remove: fn()
  }
};

export default meta;
type Story = StoryObj<CartLineComponent>;

/** The stepper and the bin report changes; the cart page applies them. */
export const SingleItem: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Increase quantity' }));
    await expect(args.quantityChange).toHaveBeenLastCalledWith(2);

    await userEvent.click(canvas.getByRole('button', { name: 'Decrease quantity' }));
    await expect(args.quantityChange).toHaveBeenLastCalledWith(0);

    await userEvent.click(canvas.getByRole('button', { name: 'Remove Buffalo Chicken Wings' }));
    await expect(args.remove).toHaveBeenCalledOnce();
  }
};

export const SeveralOfOneDish: Story = {
  args: { item: cartItem('Classic Cheeseburger', 4) },
  play: async ({ canvasElement }) => {
    // 4 × ₦6,500.00
    await expect(canvasElement.querySelector('.subtotal')).toHaveTextContent('₦26,000.00');
  }
};

export const NoPhoto: Story = {
  args: { item: { ...cartItem('Fresh Iced Lemonade', 2), product: { ...cartItem('Fresh Iced Lemonade', 2).product, imageUrl: null } } }
};
