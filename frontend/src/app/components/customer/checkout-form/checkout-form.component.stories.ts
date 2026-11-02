import { componentWrapperDecorator, type Meta, type StoryObj } from '@storybook/angular';
import { fn, userEvent, within } from 'storybook/test';

import { CheckoutFormComponent } from './checkout-form.component';

/** Chooses an order type the way a customer does: by clicking its tile. */
async function chooseOrderType(canvasElement: HTMLElement, label: 'Eat In' | 'Takeout' | 'Delivery'): Promise<void> {
  await userEvent.click(await within(canvasElement).findByText(label));
}

async function submit(canvasElement: HTMLElement): Promise<void> {
  const button = canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!button) throw new Error('No submit button');
  await userEvent.click(button);
}

const meta: Meta<CheckoutFormComponent> = {
  title: 'Customer/CheckoutForm',
  component: CheckoutFormComponent,
  decorators: [componentWrapperDecorator(story => `<div style="max-width: 680px">${story}</div>`)],
  args: {
    // Margherita Pizza + 2 Chocolate Lava Cakes from the demo menu.
    total: 15000,
    submitting: false,
    error: null,
    placeOrder: fn(),
    fulfillmentTypeChange: fn()
  }
};

export default meta;
type Story = StoryObj<CheckoutFormComponent>;

/** Nothing chosen yet: only the order types are shown. */
export const ChooseOrderType: Story = {};

/** Eat-in needs a name only; paying now asks for an email (or phone) for Paystack. */
export const DineIn: Story = {
  play: ({ canvasElement }) => chooseOrderType(canvasElement, 'Eat In')
};

/** Takeout also needs a phone number. */
export const Takeout: Story = {
  play: ({ canvasElement }) => chooseOrderType(canvasElement, 'Takeout')
};

/** Delivery needs a phone number and an address, and is always paid online. */
export const Delivery: Story = {
  play: ({ canvasElement }) => chooseOrderType(canvasElement, 'Delivery')
};

/** Submitted without picking an order type. */
export const MissingOrderType: Story = {
  play: ({ canvasElement }) => submit(canvasElement)
};

/** A takeout order submitted with a name but no phone number. */
export const TakeoutMissingPhone: Story = {
  play: async ({ canvasElement }) => {
    await chooseOrderType(canvasElement, 'Takeout');
    await userEvent.type(within(canvasElement).getByLabelText('Full Name *'), 'Adaeze Okafor');
    await userEvent.click(within(canvasElement).getByText('Pay at the counter'));
    await submit(canvasElement);
  }
};

/** A delivery order submitted with a name and phone number but no address. */
export const DeliveryMissingAddress: Story = {
  play: async ({ canvasElement }) => {
    await chooseOrderType(canvasElement, 'Delivery');
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Full Name *'), 'Chiamaka Eze');
    await userEvent.type(canvas.getByLabelText('Phone Number *'), '0803 555 1042');
    await userEvent.type(canvas.getByLabelText('Email for your receipt *'), 'chiamaka@example.com');
    await submit(canvasElement);
  }
};

/** While the page places the order, the button is disabled. */
export const Submitting: Story = {
  args: { submitting: true },
  play: ({ canvasElement }) => chooseOrderType(canvasElement, 'Delivery')
};

/** The page passes back the API's error message. */
export const ApiError: Story = {
  args: { error: 'Could not reach the restaurant. Please check your connection and try again.' },
  play: ({ canvasElement }) => chooseOrderType(canvasElement, 'Eat In')
};
