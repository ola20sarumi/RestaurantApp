import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Staff pages need the login session, which only exists in the browser (localStorage), so the server
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
    // Render per request (not prerendered at build time) so pages show live API data
    // and `ng build` does not need the backend running.
    path: '**',
    renderMode: RenderMode.Server
  }
];
