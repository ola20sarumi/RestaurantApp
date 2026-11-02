import { TestBed } from '@angular/core/testing';

import { ORDER_STATUSES } from '../../../models/restaurant.models';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  function badgeFor(status: string): HTMLElement {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.badge.rounded-pill');
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }));

  it('gives every order status its own colour', () => {
    const expected: Record<(typeof ORDER_STATUSES)[number], string> = {
      Pending: 'text-bg-warning',
      Preparing: 'text-bg-info',
      Ready: 'text-bg-success',
      Completed: 'text-bg-secondary',
      Cancelled: 'text-bg-danger'
    };

    for (const status of ORDER_STATUSES) {
      const badge = badgeFor(status);
      expect(badge.textContent?.trim()).withContext(status).toBe(status);
      expect(badge.classList).withContext(status).toContain(expected[status]);
    }
  });

  it('shows an unknown status in grey', () => {
    expect(badgeFor('Lost').classList).toContain('text-bg-secondary');
  });
});
