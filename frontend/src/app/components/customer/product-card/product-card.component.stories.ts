import { componentWrapperDecorator, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { demoProduct } from '../../../../stories/demo-fixtures';
import { ProductCardComponent } from './product-card.component';

const meta: Meta<ProductCardComponent> = {
  title: 'Customer/ProductCard',
  component: ProductCardComponent,
  decorators: [componentWrapperDecorator(story => `<div style="width: 340px">${story}</div>`)],
  // Outputs are actions: the fn() spies below record what the component emits (shown in the Actions panel).
  argTypes: { add: { action: 'add' } },
  args: {
    product: demoProduct('Margherita Pizza'),
    quantityInCart: 0,
    animationDelay: 0,
    add: fn()
  }
};

export default meta;
type Story = StoryObj<ProductCardComponent>;

/** Clicking "Add" hands the product to the page, which puts it in the cart. */
export const Available: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Add/ }));

    await expect(args.add).toHaveBeenCalledOnce();
    await expect(args.add).toHaveBeenCalledWith(args.product);
  }
};

/** The button counts how many are already in the cart. */
export const AlreadyInCart: Story = {
  args: { quantityInCart: 2 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: /Add/ })).toHaveTextContent('Add 2');
  }
};

/** A dish without a photo gets a placeholder. */
export const NoPhoto: Story = {
  args: { product: { ...demoProduct('Garlic Herb Bread'), imageUrl: null } }
};

export const LongName: Story = {
  args: {
    product: {
      ...demoProduct('Grilled Salmon Bowl'),
      name: 'Grilled Atlantic Salmon Bowl with Quinoa, Roasted Seasonal Vegetables and Lemon Tahini Dressing',
      description: 'Wild-caught salmon fillet over herbed quinoa with roasted peppers, courgette and red onion, '
        + 'finished with a bright lemon tahini dressing, toasted sesame seeds and fresh parsley.'
    }
  }
};

/** The highest price the API accepts (₦1,000,000.00), to check the price tag still fits. */
export const HighPrice: Story = {
  args: { product: { ...demoProduct('Grilled Salmon Bowl'), price: 1_000_000 } }
};
