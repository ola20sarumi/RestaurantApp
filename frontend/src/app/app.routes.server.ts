import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Staff pages need the login session, which only exists in the browser (sessionStorage), so the server
    // can't render them or run their guard — they render client-side.
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/reports',
    renderMode: RenderMode.Client
  },
  {
    path: 'cashier',
    renderMode: RenderMode.Client
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    // Checks the payment with Paystack (a POST) and may empty the browser's cart, so it runs in the browser only.
    path: 'order/:orderRef',
    renderMode: RenderMode.Client
  },
  {
    // Render per request (not prerendered at build time) so pages show live API data
    // and `ng build` does not need the backend running.
    path: '**',
    renderMode: RenderMode.Server
  }
];
