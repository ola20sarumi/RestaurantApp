import { registerLocaleData } from '@angular/common';
import localeEnNg from '@angular/common/locales/en-NG';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, Provider } from '@angular/core';

/**
 * The app's naira formatting (see app.config.ts) for unit tests and Storybook, which don't load the app config:
 * the currency pipe shows ₦3,500.00 and dates use Nigerian formats.
 */
export function provideNairaLocale(): Provider[] {
  registerLocaleData(localeEnNg);
  return [
    { provide: LOCALE_ID, useValue: 'en-NG' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'NGN' }
  ];
}
