import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService, I18N_SHARED } from '@ui/shared/i18n-shared';
import { useStore } from '@application/app-store';
import { Transaction } from '@domain/models/transaction';
import { injectParsedRouteFilters } from '@ui/shared/route-query.utils';
import {
  DateInputComponent,
  DateRangeValue,
  HeaderComponent,
  IconButtonComponent,
  IconComponent,
  SelectComponent
} from 'ibid-ui';
import { ConfirmRecurringExpenseUseCase } from '@application/use-cases/confirm-recurring-expense.use-case';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'ohsaveme-header',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    IconComponent,
    RouterLink,
    SelectComponent,
    DateInputComponent,
    IconButtonComponent,
    I18N_SHARED
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  protected readonly i18n = inject(I18nService);
  protected readonly store = useStore();
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly recurrence = inject(ConfirmRecurringExpenseUseCase);

  @Input() isSidenavOpen = false;
  @Output() toggleSidenav = new EventEmitter<void>();

  private readonly routeFilters = injectParsedRouteFilters(this.route);

  protected readonly insightId = computed<string | null>(() => this.routeFilters().insightId);

  protected readonly recurringDescription = computed<string | null>(() => this.routeFilters().search);

  protected readonly isRecurringMode = computed<boolean>(() => {
    return this.routeFilters().filter === 'recurring'
      || this.insightId() === 'active_subscriptions'
      || !!this.recurringDescription();
  });

  protected readonly recurringTargetTransactions = computed<readonly Transaction[]>(() => {
    const description = this.recurringDescription();
    const all = this.store.transactions();
    if (description) {
      return all.filter(t => t.description.toLowerCase().includes(description.toLowerCase()));
    }
    if (this.routeFilters().filter === 'recurring' || this.insightId() === 'active_subscriptions') {
      return all.filter(t => t.isRecurring);
    }
    return [];
  });

  protected readonly isRecurringConfirmed = computed<boolean>(() => {
    const targets = this.recurringTargetTransactions();
    if (targets.length === 0) return false;
    return targets.every(t => t.isRecurring === true);
  });

  protected readonly recurringActionLabel = computed<string>(() => {
    return this.isRecurringConfirmed()
      ? this.i18n.translate('insightsConfirmRecurring')
      : this.i18n.translate('insightsUnmarkRecurring');
  });

  protected readonly recurringActionIcon = computed<string>(() => {
    return this.isRecurringConfirmed() ? 'status-success' : 'status-info';
  });

  protected async onConfirmRecurring(): Promise<void> {
    const targets = this.recurringTargetTransactions();
    if (targets.length === 0) return;

    if (this.isRecurringConfirmed()) {
      await Promise.all(targets.map(m => this.recurrence.reject(m)));
    } else {
      await Promise.all(targets.map(m => this.recurrence.confirm(m)));
    }
  }

  protected readonly presetOptions = computed(() => [
    { value: 'last_month', label: this.i18n.translate('lastMonth') },
    { value: 'current_month', label: this.i18n.translate('currentMonth') },
    { value: 'quarter', label: this.i18n.translate('quarter') },
    { value: 'semester', label: this.i18n.translate('semester') },
    { value: 'year', label: this.i18n.translate('yearPreset') },
    { value: 'last_30_days', label: this.i18n.translate('last30Days') },
    { value: 'last_60_days', label: this.i18n.translate('last60Days') },
    { value: 'last_90_days', label: this.i18n.translate('last90Days') },
    { value: 'last_120_days', label: this.i18n.translate('last120Days') },
    { value: 'last_year', label: this.i18n.translate('lastYearDays') },
    { value: 'all_time', label: this.i18n.translate('allTime') },
    { value: 'custom', label: this.i18n.translate('periodCustom') }
  ]);

  onNavToggle(): void {
    this.toggleSidenav.emit();
  }

  onAddClick(): void {
    this.store.triggerAddClick();
  }

  onPresetChange(value: string): void {
    this.store.applyPreset(value);
  }

  onRangeChange(range: DateRangeValue): void {
    this.store.startDate.set(range.start);
    this.store.endDate.set(range.end);
    this.store.preset.set('custom');
  }

  onBackToInsight(): void {
    const insightId = this.insightId();
    if (!insightId) return;
    this.router.navigate(['/'], { queryParams: { focusInsight: insightId } });
  }
}
