import { type Meta, type StoryObj } from '@storybook/angular';

import { ORDER_STATUSES } from '../../../models/restaurant.models';
import { StatusBadgeComponent } from './status-badge.component';

const meta: Meta<StatusBadgeComponent> = {
  title: 'Cashier/StatusBadge',
  component: StatusBadgeComponent,
  argTypes: {
    status: { control: 'select', options: ORDER_STATUSES }
  },
  args: { status: 'Pending' }
};

export default meta;
type Story = StoryObj<StatusBadgeComponent>;

export const Pending: Story = { args: { status: 'Pending' } };
export const Preparing: Story = { args: { status: 'Preparing' } };
export const Ready: Story = { args: { status: 'Ready' } };
export const Completed: Story = { args: { status: 'Completed' } };
export const Cancelled: Story = { args: { status: 'Cancelled' } };

/** Every status side by side, to compare the colours. */
export const AllStatuses: Story = {
  render: () => ({
    props: { statuses: ORDER_STATUSES },
    template: `
      <div class="d-flex gap-2">
        @for (status of statuses; track status) {
          <app-status-badge [status]="status" />
        }
      </div>`
  })
};
