import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { provideDemoApi, setUpDemoPage } from '../../../../stories/demo-api';
import { cartItem } from '../../../../stories/demo-fixtures';
import { CartComponent } from './cart.component';

/** The cart page, with the cart the customer built on the menu (kept in localStorage). */
const meta: Meta<CartComponent> = {
  title: 'Pages/Cart',
  component: CartComponent,
  decorators: [applicationConfig({ providers: provideDemoApi() })],
  parameters: { layout: 'fullscreen' }
};

export default meta;
type Story = StoryObj<CartComponent>;

export const Empty: Story = {
  beforeEach: () => setUpDemoPage({ cart: [] })
};

export const OneItem: Story = {
  beforeEach: () => setUpDemoPage({ cart: [cartItem('Classic Cheeseburger', 1)] })
};

/** The stepper updates the line, the item count and the total. */
export const ChangeQuantity: Story = {
  beforeEach: () => setUpDemoPage({ cart: [cartItem('Classic Cheeseburger', 1), cartItem('Fresh Iced Lemonade', 2)] }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const burger = canvas.getByText('Classic Cheeseburger').closest<HTMLElement>('li')!;

    await userEvent.click(within(burger).getByRole('button', { name: 'Increase quantity' }));
    await userEvent.click(within(burger).getByRole('button', { name: 'Increase quantity' }));

    await expect(burger.querySelector('.input-group-text')).toHaveTextContent('3');
    // 3 × ₦6,500.00 + 2 × ₦1,500.00
    await expect(canvasElement.querySelector('.receipt-total .amount')).toHaveTextContent('₦22,500.00');
  }
};

/** Removing the last dish shows the empty cart. */
export const RemoveLastItem: Story = {
  beforeEach: () => setUpDemoPage({ cart: [cartItem('New York Cheesecake', 1)] }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Remove New York Cheesecake' }));

    await expect(canvas.getByText('Your cart is empty.')).toBeInTheDocument();
  }
};

export const ManyItems: Story = {
  beforeEach: () => setUpDemoPage({
    cart: [
      cartItem('Buffalo Chicken Wings', 2),
      cartItem('Margherita Pizza', 1),
      cartItem('Grilled Salmon Bowl', 1),
      cartItem('New York Cheesecake', 2),
      cartItem('Fresh Iced Lemonade', 4)
    ]
  })
};
