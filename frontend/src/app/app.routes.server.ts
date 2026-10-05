import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Render per request (not prerendered at build time) so pages show live API data
    // and `ng build` does not need the backend running.
    path: '**',
    renderMode: RenderMode.Server
  }
];
