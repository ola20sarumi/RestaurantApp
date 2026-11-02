import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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

/** An order's card, looked up again each time: the dashboard re-renders the list after every change. */
function orderCard(canvasElement: HTMLElement, id: number): HTMLElement {
  const card = within(canvasElement).getByText(`#${id}`).closest<HTMLElement>('.card');
  if (!card) throw new Error(`No card for order #${id}`);
  return card;
}

/** Status buttons send the change to the API; the dashboard reloads and shows the new status. */
export const MoveOrderOn: Story = {
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText('#66');

    await userEvent.click(within(orderCard(canvasElement, 66)).getByRole('button', { name: 'Preparing' }));

    await waitFor(() => expect(orderCard(canvasElement, 66).querySelector('.card-header .badge')).toHaveTextContent('Preparing'));
    await expect(within(orderCard(canvasElement, 66)).getByRole('button', { name: 'Preparing' })).toBeDisabled();
  }
};

/** Taking payment at the counter marks the order paid. */
export const MarkOrderPaid: Story = {
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText('#66');

    await userEvent.click(within(orderCard(canvasElement, 66)).getByRole('button', { name: 'Mark as paid' }));

    await waitFor(() => expect(orderCard(canvasElement, 66).querySelector('.payment-badge')).toHaveTextContent('Paid at counter'));
    await expect(within(orderCard(canvasElement, 66)).queryByRole('button', { name: 'Mark as paid' })).toBeNull();
  }
};

/** The status filter asks the API for one status only: today's two new orders. */
export const FilterByStatus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('#66');

    await userEvent.selectOptions(canvas.getByLabelText('Filter by status'), 'Pending');

    await waitFor(() => expect(canvasElement.querySelectorAll('.card')).toHaveLength(2));
    await expect(canvas.getByText('#65')).toBeVisible();
    await expect(canvas.getByText('#66')).toBeVisible();
  }
};
