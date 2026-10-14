import { registerLocaleData } from '@angular/common';
import localeEnNg from '@angular/common/locales/en-NG';
import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './services/auth.interceptor';

// Prices are in naira (Paystack charges in NGN): the currency pipe shows ₦3,500.00 and dates use Nigerian formats.
registerLocaleData(localeEnNg);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'en-NG' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'NGN' }
  ]
};
