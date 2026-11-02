import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { provideDemoApi, setUpDemoPage } from '../../../../stories/demo-api';
import { cartItem } from '../../../../stories/demo-fixtures';
import { MenuComponent } from './menu.component';

/** The whole menu page, loading the demo menu from the in-browser demo API. */
const meta: Meta<MenuComponent> = {
  title: 'Pages/Menu',
  component: MenuComponent,
  decorators: [applicationConfig({ providers: provideDemoApi() })],
  parameters: { layout: 'fullscreen' },
  beforeEach: () => setUpDemoPage(),
  // Wait for the demo API's answer, so the snapshot shows the dishes rather than the spinner.
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText('Margherita Pizza');
  }
};

export default meta;
type Story = StoryObj<MenuComponent>;

export const FullMenu: Story = {};

/** Dishes already in the cart show how many on their "Add" button. */
export const WithItemsInCart: Story = {
  beforeEach: () => setUpDemoPage({ cart: [cartItem('Margherita Pizza', 2), cartItem('Fresh Iced Lemonade', 3)] })
};

/** "Add" puts the dish in the real cart (CartService), and its button shows the count. */
export const AddToCart: Story = {
  play: async ({ canvasElement }) => {
    const card = (await within(canvasElement).findByText('Fettuccine Alfredo')).closest<HTMLElement>('.product-card')!;
    const add = within(card).getByRole('button', { name: /Add/ });

    await userEvent.click(add);
    await userEvent.click(add);

    await expect(add).toHaveTextContent('Add 2');
    await expect(JSON.parse(localStorage.getItem('restaurant-cart') ?? '[]')).toEqual([
      expect.objectContaining({ quantity: 2, product: expect.objectContaining({ name: 'Fettuccine Alfredo' }) })
    ]);
  }
};

/** The category buttons narrow the menu down. */
export const FilterByCategory: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('Margherita Pizza');

    await userEvent.click(canvas.getByRole('button', { name: 'Appetizers' }));

    await expect(canvasElement.querySelectorAll('.product-card')).toHaveLength(3);
    await expect(canvas.queryByText('Margherita Pizza')).toBeNull();
  }
};
