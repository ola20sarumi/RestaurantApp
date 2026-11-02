import { applicationConfig, type Preview } from '@storybook/angular';

import { provideNairaLocale } from '../src/testing/naira-locale';

const preview: Preview = {
  // Every story formats money and dates the way the app does (₦, Nigerian dates).
  decorators: [applicationConfig({ providers: [provideNairaLocale()] })],
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    controls: { expanded: true }
  }
};

export default preview;
