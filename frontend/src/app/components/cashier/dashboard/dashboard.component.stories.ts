import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { within } from 'storybook/test';

import { provideDemoApi, setUpDemoPage } from '../../../../stories/demo-api';
import { DashboardComponent } from './dashboard.component';

/**
 * The cashier dashboard with the demo's order history (two weeks up to 14 March 2026, 19:30). A demo cashier
 * session is stored first, the way signing in does, so the demo API accepts the requests.
 */
const meta: Meta<DashboardComponent> = {
  title: 'Pages/Cashier dashboard',
  component: DashboardComponent,
  decorators: [applicationConfig({ providers: provideDemoApi() })],
  parameters: { layout: 'fullscreen' },
  beforeEach: () => setUpDemoPage({ staff: 'Cashier' }),
  // Wait for the orders, so the snapshot doesn't show the spinner.
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText('#66');
  }
};

export default meta;
type Story = StoryObj<DashboardComponent>;

export const AllOrders: Story = {};
