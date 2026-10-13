import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { StaffRole } from '../models/restaurant.models';
import { AuthService } from './auth.service';

/**
 * Lets staff with one of `route.data.roles` through; everyone else goes to /login, which returns them here after
 * signing in. These routes render in the browser only (app.routes.server.ts), since the session lives in localStorage.
 */
export const staffGuard: CanActivateFn = (route, state) => {
  const roles = route.data['roles'] as StaffRole[];
  if (inject(AuthService).hasRole(roles)) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
