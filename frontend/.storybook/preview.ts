import { applicationConfig, type Preview } from '@storybook/angular';

import { provideNairaLocale } from '../src/testing/naira-locale';

const preview: Preview = {
  // Every story formats money and dates the way the app does (₦, Nigerian dates).
  decorators: [applicationConfig({ providers: [provideNairaLocale()] })],
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // Snapshot with reduced motion: the app's own styles.css then finishes every animation at once (the fade-ins,
    // and the menu hero's infinite drift, shimmer and ticker), so screenshots don't depend on animation timing.
    chromatic: { prefersReducedMotion: 'reduce', pauseAnimationAtEnd: true }
  }
};

export default preview;
