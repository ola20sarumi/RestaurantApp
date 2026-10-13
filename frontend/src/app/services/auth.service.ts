import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { LoginRequest, StaffRole, StaffSession } from '../models/restaurant.models';

const STORAGE_KEY = 'restaurant-staff-session';

/** Staff login for the admin and cashier pages. The session (JWT + role) is kept in sessionStorage in the browser only, so each tab has its own sign-in. */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _session = signal<StaffSession | null>(this.load());

  readonly session = this._session.asReadonly();
  readonly isLoggedIn = computed(() => this._session() !== null);

  login(request: LoginRequest): Observable<StaffSession> {
    return this.http.post<StaffSession>(`${API_BASE_URL}/auth/login`, request).pipe(
      tap(session => this.setSession(session))
    );
  }

  logout(): void {
    this.setSession(null);
  }

  /** The bearer token, or null when signed out or the token has expired (which also signs out). */
  token(): string | null {
    const session = this._session();
    if (session && isExpired(session)) {
      this.logout();
      return null;
    }
    return session?.token ?? null;
  }

  /** True when signed in (with an unexpired token) as one of `roles`. */
  hasRole(roles: StaffRole[]): boolean {
    return this.token() !== null && roles.includes(this._session()!.role);
  }

  /** Where to land after signing in when no page was requested. */
  homePage(): string {
    return this._session()?.role === 'Admin' ? '/admin' : '/cashier';
  }

  private setSession(session: StaffSession | null): void {
    this._session.set(session);
    if (!this.isBrowser) return;
    try {
      if (session) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage unavailable (e.g. private mode) — the session still lasts for this visit.
    }
  }

  private load(): StaffSession | null {
    if (!this.isBrowser) return null;
    try {
      const session = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as StaffSession | null;
      return session && !isExpired(session) ? session : null;
    } catch {
      return null;
    }
  }
}

function isExpired(session: StaffSession): boolean {
  return Date.parse(session.expiresAt) <= Date.now();
}
