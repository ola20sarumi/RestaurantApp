import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';

import { CartItem, StaffRole, StaffSession } from '../app/models/restaurant.models';
import { authInterceptor } from '../app/services/auth.interceptor';
import { demoBackendInterceptor, setDemoDb } from '../demo/demo-backend.interceptor';
import { demoDb } from './demo-fixtures';

// Page stories run the real pages against the demo build's in-browser API (src/demo), so no network is needed.
// Storage keys are the ones CartService and AuthService use.
const CART_KEY = 'restaurant-cart';
const SESSION_KEY = 'restaurant-staff-session';

/**
 * HttpClient answered by the demo backend (with the staff token added, as in the app), and a router for the pages'
 * links. The router doesn't navigate on start: inside Storybook the URL is iframe.html, which no route matches.
 */
export function provideDemoApi(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([authInterceptor, demoBackendInterceptor])),
    provideRouter([], withDisabledInitialNavigation())
  ];
}

/**
 * Starts a page story from a fresh demo database and the given cart and staff session. Returns the cleanup that
 * Storybook runs after the story, so stories don't leak state into each other.
 */
export function setUpDemoPage(options: { cart?: CartItem[]; staff?: StaffRole } = {}): () => void {
  setDemoDb(demoDb());
  localStorage.setItem(CART_KEY, JSON.stringify(options.cart ?? []));
  if (options.staff) {
    const session: StaffSession = {
      token: `demo-${options.staff}`,
      username: options.staff.toLowerCase(),
      role: options.staff,
      expiresAt: '2099-12-31T00:00:00Z'
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return () => {
    localStorage.removeItem(CART_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  };
}
