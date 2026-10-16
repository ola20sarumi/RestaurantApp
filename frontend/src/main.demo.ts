// Entry point of the demo build (npm run build:demo): the real app, rendered in the browser only, with the API
// replaced by an in-browser stand-in (src/demo). scripts/build-demo.mjs turns the build into one shareable HTML page.
import { registerLocaleData } from '@angular/common';
import localeEnNg from '@angular/common/locales/en-NG';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/services/auth.interceptor';
import { demoBackendInterceptor, resetDemo } from './demo/demo-backend.interceptor';
import { DEMO_STAFF } from './demo/demo-data';
import { DemoPayComponent } from './demo/demo-pay.component';

registerLocaleData(localeEnNg);

// A shared page can't show the browser's confirm() dialogs (they always answer "no"), so the admin page's
// "Delete …?" questions are answered "yes" in the demo.
window.confirm = () => true;

showDemoBanner();
useEmbeddedImages();

// Hash URLs (#/menu), because the page is served as a single file. The demo payment page goes before the catch-all.
const demoRoutes = [...routes];
demoRoutes.splice(demoRoutes.length - 1, 0, { path: 'demo-pay/:orderRef', component: DemoPayComponent });

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(demoRoutes, withComponentInputBinding(), withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor, demoBackendInterceptor])),
    { provide: LOCALE_ID, useValue: 'en-NG' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'NGN' }
  ]
}).catch((err) => console.error(err));

/**
 * Shows the embedded copies of the menu photos (window.__DEMO_IMAGES__, keyed by their Unsplash URL, added by
 * scripts/build-demo.mjs) wherever the app sets one of those URLs as an image source.
 */
function useEmbeddedImages(): void {
  const images = (window as unknown as { __DEMO_IMAGES__?: Record<string, string> }).__DEMO_IMAGES__ ?? {};
  const swap = (img: HTMLImageElement) => {
    const embedded = images[img.getAttribute('src') ?? ''];
    if (embedded) img.src = embedded;
  };
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.target instanceof HTMLImageElement) swap(mutation.target);
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLImageElement) swap(node);
        if (node instanceof Element) node.querySelectorAll('img').forEach(swap);
      });
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
}

function showDemoBanner(): void {
  const logins = DEMO_STAFF.map(s => `<code>${s.username}</code> / <code>${s.password}</code>`).join(' or ');
  const banner = document.createElement('div');
  banner.className = 'demo-banner';
  banner.innerHTML = `
    <div class="container d-flex flex-wrap align-items-center gap-2 py-2 small">
      <span class="badge text-bg-warning">Demo</span>
      <span class="flex-grow-1">Sample data, saved only in your browser.
        Staff pages: use <a href="#/login">Staff login</a> (bottom of the page) with ${logins}.</span>
      <button type="button" class="btn btn-sm btn-outline-light">Reset demo</button>
    </div>`;
  banner.querySelector('button')!.addEventListener('click', () => {
    resetDemo();
    try {
      localStorage.removeItem('restaurant-cart');
      sessionStorage.removeItem('restaurant-staff-session');
    } catch {
      // Storage unavailable: nothing was saved.
    }
    location.hash = '#/menu';
    location.reload();
  });
  document.body.prepend(banner);
}
