import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GetDashboardInsightsUseCase } from '@application/use-cases/get-dashboard-insights.use-case';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';
import { ConfirmRecurringExpenseUseCase } from '@application/use-cases/confirm-recurring-expense.use-case';
import { useStore } from '@application/app-store';
import {
  BalanceAveragePayload,
  ComparisonBarsPayload,
  CompositionPayload,
  CompositionSlice,
  RetrospectivePayload,
  FinancialInsight,
  SubscriptionItem,
  HighlightMetricPayload,
  RunRatePayload,
  TrendTablePayload,
  OverspendAlertPayload,
} from '@domain/models/financial-insight.model';
import { BalanceWindow, MonthlyNetFlowPoint } from '@domain/shared/balance-average.utils';
import { ChartSeries } from '@domain/models/chart-series';
import { buildFilterParams } from '@domain/services/suggestion-resolver';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { CardComponent, ChartComponent, CurrencyDisplayComponent, HandDrawnDirective, IconButtonComponent, IconComponent, LegendItemComponent, SegmentOption, SegmentedControlComponent, StackDotsComponent } from 'ibid-ui';

const MAX_VISIBLE_DEPTH = 3;
const SWIPE_THRESHOLD_PX = 40;
const WINDOW_LABEL_KEYS: Record<BalanceWindow, string> = {
  quarter: 'insightsWindowQuarter',
  semester: 'insightsWindowSemester',
  year: 'insightsWindowYear',
  all: 'insightsWindowAll',
};

@Component({
  selector: 'ohsaveme-dashboard-insights',
  standalone: true,
  imports: [CurrencyDisplayComponent,
    CommonModule,
    CardComponent,
    HandDrawnDirective,
    IconButtonComponent,
    LegendItemComponent,
    StackDotsComponent,
    IconComponent,
    ChartComponent,
    SegmentedControlComponent,
    ...I18N_SHARED,
  ],
  templateUrl: './dashboard-insights.html',
  styleUrl: './dashboard-insights.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardInsightsComponent {
  private readonly useCase = inject(GetDashboardInsightsUseCase);
  private readonly router = inject(Router);
  private readonly dismissalService = inject(SuggestionDismissalService);
  private readonly recurrence = inject(ConfirmRecurringExpenseUseCase);
  private readonly store = useStore();
  protected readonly i18n = inject(I18nService);

  readonly focusInsightId = input<string | null>(null);
  @Output() readonly focusApplied = new EventEmitter<void>();

  readonly showArchived = signal<boolean>(false);

  readonly archivedInsights = computed<readonly FinancialInsight[]>(() => this.useCase.archivedInsights());
  readonly hasArchive = computed<boolean>(() => this.archivedInsights().length > 0);

  private readonly liveInsights = computed<readonly FinancialInsight[]>(() => {
    const active = this.useCase.activeInsights();
    const wantedId = this.focusInsightId() ?? this.pinnedInsightId();
    if (!wantedId || active.some(insight => insight.id === wantedId)) return active;

    const wanted = this.useCase.insights().find(insight => insight.id === wantedId);
    return wanted ? [wanted, ...active] : active;
  });

  readonly insights = computed<readonly FinancialInsight[]>(() =>
    this.showArchived() ? this.archivedInsights() : this.liveInsights()
  );
  readonly hasInsights = computed<boolean>(() => this.insights().length > 0);
  readonly maxVisibleDepth = MAX_VISIBLE_DEPTH;

  private readonly requestedFrontIndex = signal<number>(0);
  private readonly appliedFocusId = signal<string | null>(null);
  private readonly pinnedInsightId = signal<string | null>(null);
  readonly balanceWindow = signal<BalanceWindow>('year');

  readonly frontIndex = computed<number>(() => {
    const total = this.insights().length;
    if (total === 0) return 0;
    return Math.min(this.requestedFrontIndex(), total - 1);
  });

  private pointerStart: { x: number; y: number } | null = null;
  private wasSwipe = false;

  constructor() {
    effect(() => {
      const targetId = this.focusInsightId();
      if (!targetId || targetId === this.appliedFocusId()) return;

      const index = this.liveInsights().findIndex(insight => insight.id === targetId);
      if (index === -1) return;

      this.showArchived.set(false);
      this.requestedFrontIndex.set(index);
      this.appliedFocusId.set(targetId);
      this.pinnedInsightId.set(targetId);
      this.focusApplied.emit();
    });
  }

  depthOf(index: number): number {
    const n = this.insights().length;
    if (n === 0) return 0;
    return ((index - this.frontIndex()) % n + n) % n;
  }

  onCardClicked(index: number): void {
    if (this.wasSwipe) {
      this.wasSwipe = false;
      return;
    }
    const depth = this.depthOf(index);
    if (depth !== 0) {
      this.onRotateBy(depth);
    }
  }

  onRotateBy(steps: number): void {
    const n = this.insights().length;
    if (n === 0) return;
    const nextIndex = ((this.frontIndex() + steps) % n + n) % n;
    this.requestedFrontIndex.set(nextIndex);
    this.pinnedInsightId.set(null);
  }

  onNext(): void {
    this.onRotateBy(1);
  }

  onPrev(): void {
    this.onRotateBy(-1);
  }

  onDotClicked(index: number): void {
    this.requestedFrontIndex.set(index);
    this.pinnedInsightId.set(null);
  }

  onPointerDown(event: PointerEvent, depth: number): void {
    if (depth !== 0) return;
    this.pointerStart = { x: event.clientX, y: event.clientY };
  }

  onPointerUp(event: PointerEvent, depth: number): void {
    if (depth !== 0 || !this.pointerStart) return;
    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;
    this.pointerStart = null;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
      this.wasSwipe = true;
      this.onRotateBy(deltaX < 0 ? 1 : -1);
    }
  }

  onAction(insight: FinancialInsight): void {
    if (!insight.route) return;
    this.dismissalService.markActioned(insight.kind, insight.id);
    const queryParams = { ...buildFilterParams(insight.filter), insightId: insight.id };
    this.router.navigate([insight.route], { queryParams });
  }

  onDismissCard(insight: FinancialInsight, event: Event): void {
    event.stopPropagation();
    this.dismissalService.dismiss(insight.kind, insight.id);
    this.pinnedInsightId.set(null);
    this.requestedFrontIndex.set(0);
  }

  onRestore(insight: FinancialInsight, event: Event): void {
    event.stopPropagation();
    this.dismissalService.reset(insight.kind, insight.id);
    this.requestedFrontIndex.set(0);

    if (this.archivedInsights().length === 0) this.showArchived.set(false);
  }

  onDeleteForever(insight: FinancialInsight, event: Event): void {
    event.stopPropagation();
    this.dismissalService.dismissPermanently(insight.kind, insight.id);
    this.requestedFrontIndex.set(0);
  }

  onToggleArchive(): void {
    this.showArchived.update(shown => !shown);
    this.pinnedInsightId.set(null);
    this.requestedFrontIndex.set(0);
  }

  archiveToggleLabel(): string {
    return this.i18n.translate(this.showArchived() ? 'insightsArchiveHideLabel' : 'insightsArchiveShowLabel');
  }

  asHighlightMetric(insight: FinancialInsight): HighlightMetricPayload {
    return insight.payload as HighlightMetricPayload;
  }

  asRunRate(insight: FinancialInsight): RunRatePayload {
    return insight.payload as RunRatePayload;
  }

  asTrendTable(insight: FinancialInsight): TrendTablePayload {
    return insight.payload as TrendTablePayload;
  }

  asOverspendAlert(insight: FinancialInsight): OverspendAlertPayload {
    return insight.payload as OverspendAlertPayload;
  }

  asBalanceAverage(insight: FinancialInsight): BalanceAveragePayload {
    return insight.payload as BalanceAveragePayload;
  }

  isItemRecurringConfirmed(item: SubscriptionItem): boolean {
    if (item.transactionId) {
      const tx = this.store.transactions().find(t => t.id === item.transactionId);
      if (tx) return tx.isRecurring === true;
    }
    return item.isRecurring === true;
  }

  unconfirmedSubscriptionCount(insight: FinancialInsight): number {
    return this.asTrendTable(insight).items.filter(item => !this.isItemRecurringConfirmed(item)).length;
  }

  canConfirmRecurrence(insight: FinancialInsight): boolean {
    return insight.kind === 'active_subscriptions'
      && this.unconfirmedSubscriptionCount(insight) > 0;
  }

  isRecurrenceAllConfirmed(insight: FinancialInsight): boolean {
    return insight.kind === 'active_subscriptions'
      && this.asTrendTable(insight).items.length > 0
      && this.unconfirmedSubscriptionCount(insight) === 0;
  }

  async onConfirmRecurrence(insight: FinancialInsight): Promise<void> {
    const items = this.asTrendTable(insight).items;
    await Promise.all(items.map(async item => {
      const transaction = this.store.transactions().find(t => t.id === item.transactionId);
      if (transaction) await this.recurrence.confirm(transaction);
    }));

    this.dismissalService.dismiss(insight.kind, insight.id);
    this.pinnedInsightId.set(null);
    this.requestedFrontIndex.set(0);
  }

  asComposition(insight: FinancialInsight): CompositionPayload {
    return insight.payload as CompositionPayload;
  }

  asComparisonBars(insight: FinancialInsight): ComparisonBarsPayload {
    return insight.payload as ComparisonBarsPayload;
  }

  asRetrospective(insight: FinancialInsight): RetrospectivePayload {
    return insight.payload as RetrospectivePayload;
  }

  sliceShare(slice: CompositionSlice, total: number): number {
    return total > 0 ? (slice.amount / total) * 100 : 0;
  }

  readonly windowOptions = computed<SegmentOption[]>(() =>
    (Object.keys(WINDOW_LABEL_KEYS) as BalanceWindow[]).map(value => ({
      value,
      label: this.i18n.translate(WINDOW_LABEL_KEYS[value]),
    }))
  );

  onWindowChange(value: string): void {
    this.balanceWindow.set(value as BalanceWindow);
  }

  balanceAverageSeries(insight: FinancialInsight): readonly ChartSeries[] {
    const points = this.asBalanceAverage(insight).series[this.balanceWindow()];
    return [
      {
        name: this.i18n.translate('insightsBalanceAverageBarLabel'),
        color: 'var(--color-pink-mid)',
        type: 'bar',
        points: points.map(point => this.toChartPoint(point, point.averageNetFlow)),
      },
      {
        name: this.i18n.translate('insightsBalanceAverageLineLabel'),
        color: 'var(--color-text-muted, #8a8a85)',
        type: 'line',
        points: points.map(point => this.toChartPoint(point, point.realBalance)),
      },
    ];
  }

  private toChartPoint(point: MonthlyNetFlowPoint, value: number) {
    return {
      label: point.month,
      value,
      displayValue: this.i18n.formatCurrency(value),
    };
  }

  getStatusColor(status: 'on_track' | 'warning' | 'critical'): string {
    if (status === 'on_track') return 'var(--color-pink-mid)';
    if (status === 'warning') return 'var(--color-amber-mid)';
    return 'var(--color-coral-mid)';
  }

  getActionLabel(insight: FinancialInsight): string {
    if (insight.actionLabelKey) {
      return this.i18n.translate(insight.actionLabelKey);
    }
    if (insight.route?.startsWith('/budget') || insight.route?.startsWith('/orcamento')) {
      return this.i18n.translate('insightsActionViewBudget');
    }
    return this.i18n.translate('insightsActionViewMovements');
  }
}
