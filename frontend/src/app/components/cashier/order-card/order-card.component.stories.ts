import { componentWrapperDecorator, type Meta, type StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';

import { demoOrder } from '../../../../stories/demo-fixtures';
import { OrderCardComponent } from './order-card.component';

// Orders from the demo's order history (src/demo/demo-data.ts, built for a fixed date).
const meta: Meta<OrderCardComponent> = {
  title: 'Cashier/OrderCard',
  component: OrderCardComponent,
  decorators: [componentWrapperDecorator(story => `<div style="max-width: 560px">${story}</div>`)],
  args: {
    order: demoOrder(66),
    statusChange: fn(),
    markPaid: fn()
  }
};

export default meta;
type Story = StoryObj<OrderCardComponent>;

// Every kitchen status.

/** A takeout order to be paid at the counter, just placed. */
export const Pending: Story = { args: { order: demoOrder(66) } };

export const Preparing: Story = { args: { order: demoOrder(64) } };

/** An eat-in order paid online, ready to serve. */
export const Ready: Story = { args: { order: demoOrder(63) } };

/** A takeout order with three dishes, paid at the counter. */
export const Completed: Story = { args: { order: demoOrder(52) } };

/** Cancelled before it was paid. */
export const Cancelled: Story = { args: { order: demoOrder(53) } };

// Every way an order can be paid (or not yet) on the cashier page. Online orders only reach the cashier once
// Paystack has confirmed them, so an unpaid order is always one to be paid at the counter.

/** A delivery order paid online: address and phone shown, no "Mark as paid". */
export const PaidOnline: Story = { args: { order: demoOrder(65) } };

/** An eat-in order paid at the counter. */
export const PaidAtCounter: Story = { args: { order: demoOrder(57) } };

/** Served but not paid yet: the cashier can mark it paid. */
export const UnpaidAtCounter: Story = {
  args: { order: demoOrder(57, { status: 'Ready', paymentStatus: 'Unpaid', paidAt: null }) }
};

/** An eat-in guest who gave no name. */
export const AnonymousEatIn: Story = { args: { order: demoOrder(53, { customerName: '' }) } };
