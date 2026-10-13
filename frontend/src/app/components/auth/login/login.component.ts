import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { describeApiError } from '../../../services/api-error';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Page to go back to after signing in (set by the route guard), bound from the query string. */
  readonly returnUrl = input<string>();

  readonly session = this.auth.session;
  readonly username = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  /** Signed in already, but sent here by the guard: the current account can't open the requested page. */
  readonly wrongRole = computed(() => this.session() !== null && !!this.safeReturnUrl());

  login(): void {
    if (!this.username().trim() || !this.password()) {
      this.error.set('Enter your username and password.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.auth.login({ username: this.username().trim(), password: this.password() }).subscribe({
      next: () => this.router.navigateByUrl(this.safeReturnUrl() ?? this.auth.homePage()),
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, 'Could not sign in. Please try again.'));
        this.password.set('');
        this.submitting.set(false);
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }

  /** Only in-app paths, so a crafted link can't send someone to another site after login. */
  private safeReturnUrl(): string | null {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : null;
  }
}
