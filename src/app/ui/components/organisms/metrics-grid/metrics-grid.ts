import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { CurrencyDisplayComponent, CurrencyExplanationRow, HandDrawnDirective, ViewMoreLinkComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-metrics-grid',
  standalone: true,
  imports: [
    CommonModule,
    ViewMoreLinkComponent,
    CurrencyDisplayComponent,
    HandDrawnDirective,
    ...I18N_SHARED
  ],

  templateUrl: './metrics-grid.html',
  styleUrl: './metrics-grid.scss'
})
export class MetricsGridComponent {
  private readonly i18n = inject(I18nService);

  @Input() incomePeriod = 0;
  @Input() expensePeriod = 0;
  @Input() periodBalance = 0;
  @Input() freeBalance = 0;
  @Input() initialBalance = 0;

  @Input() currentBalance = 0;
  @Input() balance = 0;
  @Input() walletBalance = 0;
  @Input() walletBalanceExplanation: readonly CurrencyExplanationRow[] = [];
  @Input() totalIncome = 0;
  @Input() totalExpenses = 0;
  @Input() budgetPercent = 0;
  @Input() budgetLimit = 0;
  @Input() activeBudgetsReserve = 0;
  @Input() categoryCommittedRemaining = 0;
  @Input() activeBudgetsSpent = 0;
  @Input() activeBudgetsMonthlyReserve = 0;
  @Input() investmentBalance = 0;
  @Input() freeBalanceWithInvestments = 0;
  @Input() totalPatrimony = 0;
  @Input() investedValue = 0;
  @Input() assetsValue = 0;

  private row(labelKey: string, amount: number): CurrencyExplanationRow {
    return { label: this.i18n.translate(labelKey), value: this.i18n.formatCurrency(amount) };
  }

  get savingsDeduction(): number {
    return this.activeBudgetsReserve === 0 ? 0 : -this.activeBudgetsReserve;
  }

  get categoryDeduction(): number {
    return this.categoryCommittedRemaining === 0 ? 0 : -this.categoryCommittedRemaining;
  }

  get savingsExplanation(): readonly CurrencyExplanationRow[] {
    return [
      this.row('metricsMonthlyReserve', this.activeBudgetsMonthlyReserve),
      this.row('metricsAccumulatedReserve', this.activeBudgetsReserve)
    ];
  }

  get freeBalanceExplanation(): readonly CurrencyExplanationRow[] {
    return [
      this.row('netBalance', this.walletBalance),
      this.row('metricsSavings', this.savingsDeduction),
      this.row('budgetLabelReservedCategories', this.categoryDeduction),
      this.row('remainingFunds', this.freeBalance)
    ];
  }

  get periodBalanceExplanation(): readonly CurrencyExplanationRow[] {
    return [
      this.row('dashboardStatIncome', this.totalIncome),
      this.row('dashboardStatExpense', this.totalExpenses),
      this.row('dashboardStatPeriodBalance', this.balance)
    ];
  }

  get patrimonyExplanation(): readonly CurrencyExplanationRow[] {
    return [
      this.row('metricsInvestedValue', this.investedValue),
      this.row('metricsAssetsPaid', this.assetsValue),
      this.row('metricsTotalPatrimony', this.totalPatrimony)
    ];
  }

  get reserveExplanation(): readonly CurrencyExplanationRow[] {
    return [
      this.row('metricsMonthlyReserve', this.activeBudgetsMonthlyReserve),
      this.row('metricsAccumulatedReserve', this.activeBudgetsReserve)
    ];
  }

  get isPositiveBalance(): boolean {
    return this.periodBalance >= 0;
  }

  get totalVolume(): number {
    return Math.abs(this.incomePeriod) + Math.abs(this.expensePeriod);
  }

  get incomePercentage(): number {
    if (this.totalVolume === 0) return 50;
    return Math.round((Math.abs(this.incomePeriod) / this.totalVolume) * 100);
  }

  get expensePercentage(): number {
    if (this.totalVolume === 0) return 50;
    return 100 - this.incomePercentage;
  }
}
