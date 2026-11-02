import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { within } from 'storybook/test';

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
