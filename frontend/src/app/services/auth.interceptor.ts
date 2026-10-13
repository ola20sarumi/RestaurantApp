import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';

/** Sends the staff token with API calls, and returns to the login page when the API rejects it (e.g. it expired). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // The login call itself never carries a token, so a wrong password there doesn't sign anyone out.
  const isApiCall = req.url.startsWith(API_BASE_URL) && !req.url.startsWith(`${API_BASE_URL}/auth/`);
  const token = isApiCall ? auth.token() : null;
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    })
  );
};
