import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
  readonly year = new Date().getFullYear();
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Whether the staff links are unfolded below 992px (from 992px up they're always on the bar). */
  readonly staffMenuOpen = signal(false);

  constructor() {
    // Fold the menu away once a link in it (or anywhere else) has taken the user to another page.
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.staffMenuOpen.set(false));
  }

  toggleStaffMenu(): void {
    this.staffMenuOpen.update(open => !open);
  }

  closeStaffMenu(): void {
    this.staffMenuOpen.set(false);
  }

  logout(): void {
    this.closeStaffMenu();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
