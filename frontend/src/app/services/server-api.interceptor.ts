import { HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';

import { API_BASE_URL } from '../api.config';

/**
 * Where the SSR server reaches the API, when that differs from the browser's API_BASE_URL
 * (in Docker, "localhost" inside the frontend container is the container itself).
 * Provided only on the server (app.config.server.ts), from the API_INTERNAL_URL environment variable.
 */
export const SERVER_API_BASE_URL = new InjectionToken<string | null>('SERVER_API_BASE_URL', {
  factory: () => null,
});

/** On the server, sends API calls to SERVER_API_BASE_URL instead of API_BASE_URL. Does nothing in the browser. */
export const serverApiInterceptor: HttpInterceptorFn = (req, next) => {
  const serverBase = inject(SERVER_API_BASE_URL);
  if (!serverBase || !req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }
  return next(req.clone({ url: serverBase.replace(/\/$/, '') + req.url.slice(API_BASE_URL.length) }));
};
