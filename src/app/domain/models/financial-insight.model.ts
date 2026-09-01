import { BalanceWindow, MonthlyNetFlowPoint } from '@domain/shared/balance-average.utils';
import { TransactionFilter } from './assistant-suggestion.model';

export type FinancialInsightKind =
  | 'safe_to_spend'
  | 'positive_savings'
  | 'spending_velocity'
  | 'grocery_forecast'
  | 'vacation_budget_active'
  | 'active_subscriptions'
  | 'bill_increase'
  | 'recurring_expense'
  | 'outlier_transactions'
  | 'category_overspend'
  | 'balance_average'
  | 'portfolio_income'
  | 'patrimony_split'
  | 'property_equity'
  | 'savings_rate'
  | 'essential_vs_lifestyle'
  | 'emergency_fund'
  | 'fixed_cost_ratio'
  | 'category_pressure'
  | 'project_retrospective';

export type FinancialInsightArchetype =
  | 'highlight_metric'
  | 'run_rate'
  | 'trend_table'
  | 'overspend_alert'
  | 'balance_average'
  | 'composition'
  | 'comparison_bars'
  | 'retrospective';

export type MetricUnit = 'currency' | 'percent' | 'months';

export interface HighlightMetricPayload {
  readonly value: number;
  readonly unit?: MetricUnit;
  readonly formattedValue?: string;
  readonly labelKey?: string;
  readonly subtextKey?: string;
  readonly trendPercentage?: number;
  readonly isPositive?: boolean;
}

export interface RunRatePayload {
  readonly currentRate: number;
  readonly recommendedRate: number;
  readonly percentageSpent: number;
  readonly percentageTimeElapsed: number;
  readonly status: 'on_track' | 'warning' | 'critical';
  readonly targetAmount: number;
  readonly spentAmount: number;
  readonly daysRemaining: number;
}

export interface SubscriptionItem {
  readonly description: string;
  readonly date?: string;
  readonly amount: number;
  readonly changePercentage?: number;
  readonly transactionId?: string;
  readonly isRecurring?: boolean;
}

export interface TrendTablePayload {
  readonly items: readonly SubscriptionItem[];
  readonly averageAmount?: number;
  readonly totalAmount?: number;
}

export interface OverspendAlertPayload {
  readonly categoryId: string;
  readonly categoryName?: string;
  readonly budgetAmount: number;
  readonly spentAmount: number;
  readonly overspendAmount: number;
  readonly percentageExceeded: number;
}

export interface BalanceAveragePayload {
  readonly series: Readonly<Record<BalanceWindow, readonly MonthlyNetFlowPoint[]>>;
}

export type CompositionTone = 'owned' | 'committed' | 'locked';

export interface AssetEquityItem {
  readonly name: string;
  readonly kind: string;
  readonly paidAmount: number;
  readonly outstandingDebt: number;
  readonly paidPercentage: number;
  readonly debtPercentage: number;
  readonly paidInstalments?: number;
  readonly contractedInstalments?: number;
}

export interface CompositionSlice {
  readonly labelKey?: string;
  readonly label?: string;
  readonly amount: number;
  readonly tone: CompositionTone;
}

export type CompositionUnit = 'currency' | 'count';

export interface CompositionPayload {
  readonly slices: readonly CompositionSlice[];
  readonly total: number;
  readonly unit: CompositionUnit;
  readonly items?: readonly AssetEquityItem[];
}

export interface ComparisonBar {
  readonly labelKey?: string;
  readonly label: string;
  readonly percentage: number;
  readonly spent: number;
  readonly target: number;
  readonly categoryId: string;
  readonly isOverBudget: boolean;
}

export interface ComparisonBarsPayload {
  readonly bars: readonly ComparisonBar[];
  readonly threshold: number;
}

export interface RetrospectiveDay {
  readonly date: string;
  readonly total: number;
}

export interface RetrospectivePayload {
  readonly projectId: string;
  readonly total: number;
  readonly target: number;
  readonly costliestDays: readonly RetrospectiveDay[];
  readonly cheapestDays: readonly RetrospectiveDay[];
  readonly items: readonly SubscriptionItem[];
}

export type FinancialInsightPayload =
  | HighlightMetricPayload
  | RunRatePayload
  | TrendTablePayload
  | OverspendAlertPayload
  | BalanceAveragePayload
  | CompositionPayload
  | ComparisonBarsPayload
  | RetrospectivePayload;

export interface FinancialInsightTemplate {
  readonly id: string;
  readonly kind: FinancialInsightKind;
  readonly visualArchetype: FinancialInsightArchetype;
  readonly icon: string;
  readonly titleKey: string;
  readonly subtextKey: string;
  readonly actionLabelKey?: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly filter: TransactionFilter | null;
  readonly route: string | null;
  readonly action: string | null;
  readonly payload: FinancialInsightPayload;
}

export interface FinancialInsight {
  readonly id: string;
  readonly kind: FinancialInsightKind;
  readonly visualArchetype: FinancialInsightArchetype;
  readonly icon: string;
  readonly title: string;
  readonly subtext: string;
  readonly actionLabelKey?: string;
  readonly filter: TransactionFilter | null;
  readonly route: string | null;
  readonly action: string | null;
  readonly payload: FinancialInsightPayload;
}
