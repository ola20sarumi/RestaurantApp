import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

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
