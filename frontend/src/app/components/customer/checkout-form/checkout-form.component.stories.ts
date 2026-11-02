import { componentWrapperDecorator, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

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
  // Outputs are actions: the fn() spies below record what the component emits (shown in the Actions panel).
  argTypes: { placeOrder: { action: 'placeOrder' }, fulfillmentTypeChange: { action: 'fulfillmentTypeChange' } },
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
  play: async ({ args, canvasElement }) => {
    await chooseOrderType(canvasElement, 'Eat In');
    const canvas = within(canvasElement);

    await expect(args.fulfillmentTypeChange).toHaveBeenCalledWith('DineIn');
    await expect(canvas.getByLabelText('Full Name *')).toBeInTheDocument();
    await expect(canvas.queryByLabelText('Phone Number *')).toBeNull();
    await expect(canvas.queryByLabelText('Delivery Address *')).toBeNull();
    await expect(canvas.getByText('Pay at the counter')).toBeInTheDocument();
  }
};

/** Takeout also needs a phone number. */
export const Takeout: Story = {
  play: async ({ canvasElement }) => {
    await chooseOrderType(canvasElement, 'Takeout');
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Phone Number *')).toBeInTheDocument();
    await expect(canvas.queryByLabelText('Delivery Address *')).toBeNull();
  }
};

/** Delivery needs a phone number and an address, and is always paid online. */
export const Delivery: Story = {
  play: async ({ canvasElement }) => {
    await chooseOrderType(canvasElement, 'Delivery');
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Phone Number *')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Delivery Address *')).toBeInTheDocument();
    await expect(canvas.queryByText('Pay at the counter')).toBeNull();
    await expect(canvas.getByRole('button', { name: /Pay ₦15,000.00/ })).toBeInTheDocument();
  }
};

/** Submitted without picking an order type. */
export const MissingOrderType: Story = {
  play: async ({ args, canvasElement }) => {
    await submit(canvasElement);

    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent("Please choose how you'd like your order.");
    await expect(args.placeOrder).not.toHaveBeenCalled();
  }
};

/** A takeout order submitted with a name but no phone number. */
export const TakeoutMissingPhone: Story = {
  play: async ({ args, canvasElement }) => {
    await chooseOrderType(canvasElement, 'Takeout');
    await userEvent.type(within(canvasElement).getByLabelText('Full Name *'), 'Adaeze Okafor');
    await userEvent.click(within(canvasElement).getByText('Pay at the counter'));
    await submit(canvasElement);

    await waitFor(() => expect(within(canvasElement).getByText('Please enter your phone number.')).toBeVisible());
    await expect(args.placeOrder).not.toHaveBeenCalled();
  }
};

/** A delivery order submitted with a name and phone number but no address. */
export const DeliveryMissingAddress: Story = {
  play: async ({ args, canvasElement }) => {
    await chooseOrderType(canvasElement, 'Delivery');
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Full Name *'), 'Chiamaka Eze');
    await userEvent.type(canvas.getByLabelText('Phone Number *'), '0803 555 1042');
    await userEvent.type(canvas.getByLabelText('Email for your receipt *'), 'chiamaka@example.com');
    await submit(canvasElement);

    await waitFor(() => expect(canvas.getByText('Please enter your delivery address.')).toBeVisible());
    await expect(args.placeOrder).not.toHaveBeenCalled();
  }
};

/** A complete takeout order paid at the counter: the form hands the page exactly what POST /api/orders needs. */
export const PlacesTakeoutOrder: Story = {
  play: async ({ args, canvasElement }) => {
    await chooseOrderType(canvasElement, 'Takeout');
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Full Name *'), 'Tunde Bakare');
    await userEvent.type(canvas.getByLabelText('Phone Number *'), '0803 555 1002');
    await userEvent.click(canvas.getByText('Pay at the counter'));
    await submit(canvasElement);

    await expect(args.placeOrder).toHaveBeenCalledOnce();
    await expect(args.placeOrder).toHaveBeenCalledWith({
      fulfillmentType: 'Takeout',
      customerName: 'Tunde Bakare',
      customerPhone: '0803 555 1002',
      deliveryAddress: undefined,
      paymentMethod: 'Counter',
      customerEmail: undefined
    });
  }
};

/** While the page places the order, the button is disabled. */
export const Submitting: Story = {
  args: { submitting: true },
  play: async ({ canvasElement }) => {
    await chooseOrderType(canvasElement, 'Delivery');

    await expect(within(canvasElement).getByRole('button', { name: /Taking you to Paystack/ })).toBeDisabled();
  }
};

/** The page passes back the API's error message. */
export const ApiError: Story = {
  args: { error: 'Could not reach the restaurant. Please check your connection and try again.' },
  play: ({ canvasElement }) => chooseOrderType(canvasElement, 'Eat In')
};
