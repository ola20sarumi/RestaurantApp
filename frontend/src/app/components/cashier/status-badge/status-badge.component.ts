import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const BADGE_CLASSES: Record<string, string> = {
  Pending: 'text-bg-warning',
  Preparing: 'text-bg-info',
  Ready: 'text-bg-success',
  Cancelled: 'text-bg-danger'
};

/** An order's kitchen status as a coloured pill (Completed and anything unknown are grey). */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge rounded-pill" [class]="badgeClass()">{{ status() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();

  readonly badgeClass = computed(() => BADGE_CLASSES[this.status()] ?? 'text-bg-secondary');
}
