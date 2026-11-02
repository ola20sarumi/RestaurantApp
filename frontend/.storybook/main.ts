import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/angular',
    options: {}
  },
  // The menu photos that the demo build embeds; stories use these copies instead of loading them from Unsplash.
  staticDirs: [{ from: '../src/demo/images', to: '/demo-images' }]
};

export default config;
