import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FULFILLMENT_OPTIONS, FulfillmentType, OrderReport } from '../../../models/restaurant.models';
import { describeApiError } from '../../../services/api-error';
import { OrderService } from '../../../services/order.service';

type Preset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth';

/** What "completed" means for each order type, shown in the order-type breakdown. */
const COMPLETED_LABELS: Record<FulfillmentType, string> = {
  DineIn: 'served',
  Takeout: 'picked up',
  Delivery: 'delivered'
};

@Component({
  selector: 'app-reports',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly presets: { value: Preset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7', label: 'Last 7 days' },
    { value: 'thisMonth', label: 'This month' },
    { value: 'lastMonth', label: 'Last month' }
  ];

  /** The selected quick filter, or null when a month or custom range was picked. */
  readonly preset = signal<Preset | null>('today');
  /** yyyy-MM bound to the month picker. */
  month = '';
  /** yyyy-MM-dd bound to the custom range inputs. */
  customFrom = '';
  customTo = '';

  readonly report = signal<OrderReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly isSingleDay = computed(() => {
    const report = this.report();
    return report !== null && report.from === report.to;
  });

  readonly averageOrder = computed(() => {
    const report = this.report();
    return report && report.completedOrders > 0 ? report.revenue / report.completedOrders : 0;
  });

  ngOnInit(): void {
    this.applyPreset('today');
  }

  applyPreset(preset: Preset): void {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    const ranges: Record<Preset, [Date, Date]> = {
      today: [today, today],
      yesterday: [new Date(y, m, d - 1), new Date(y, m, d - 1)],
      last7: [new Date(y, m, d - 6), today],
      thisMonth: [new Date(y, m, 1), today],
      lastMonth: [new Date(y, m - 1, 1), new Date(y, m, 0)]
    };
    this.preset.set(preset);
    const [from, to] = ranges[preset];
    this.load(toIsoDate(from), toIsoDate(to));
  }

  applyMonth(): void {
    if (!this.month) return;
    const [y, m] = this.month.split('-').map(Number);
    this.preset.set(null);
    this.load(toIsoDate(new Date(y, m - 1, 1)), toIsoDate(new Date(y, m, 0)));
  }

  applyCustom(): void {
    if (!this.customFrom || !this.customTo) {
      this.error.set('Pick both a start and an end date.');
      return;
    }
    if (this.customTo < this.customFrom) {
      this.error.set('The end date must be on or after the start date.');
      return;
    }
    this.preset.set(null);
    this.load(this.customFrom, this.customTo);
  }

  reload(): void {
    const report = this.report();
    if (report) this.load(report.from, report.to);
  }

  fulfillmentOption(type: FulfillmentType) {
    return FULFILLMENT_OPTIONS.find(o => o.value === type);
  }

  completedLabel(type: FulfillmentType): string {
    return COMPLETED_LABELS[type];
  }

  private load(from: string, to: string): void {
    // Keep the range inputs in step with whatever filter was used, so it's easy to adjust.
    this.customFrom = from;
    this.customTo = to;
    this.month = from.slice(0, 7) === to.slice(0, 7) && from.endsWith('-01') ? from.slice(0, 7) : '';
    this.loading.set(true);
    this.error.set(null);
    this.orderService.getReport(from, to).subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(describeApiError(err, 'Could not load the report.'));
        this.loading.set(false);
      }
    });
  }
}

/** yyyy-MM-dd for a date in the browser's local time (toISOString would shift it to UTC). */
function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
