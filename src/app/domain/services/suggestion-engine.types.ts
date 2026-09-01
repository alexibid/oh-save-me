import { Account } from '@domain/models/account';
import { Budget } from '@domain/models/budget';
import { CategoryInfo } from '@domain/models/category';
import { Transaction } from '@domain/models/transaction';
import { DEFAULT_INSIGHT_CONFIG, InsightConfig } from './insight-config';
import { ICON_BY_KIND } from './insight-registry';

export interface RecurringCandidate {
  readonly description: string;
  readonly months: number;
  readonly amount: number;
  readonly transactionId: string;
}

export interface PatrimonySnapshot {
  readonly accessible: number;
  readonly reserved: number;
  readonly invested: number;
  readonly property: number;
  readonly outstandingDebt: number;
  readonly receivedIncome: number;
  readonly firstIncomeDate: string | null;
  readonly paidInstalments: number;
  readonly contractedInstalments: number;
}

export interface SuggestionEngineParams {
  readonly accounts: readonly Account[];
  readonly transactions: readonly Transaction[];
  readonly budgets: readonly Budget[];
  readonly categories: readonly CategoryInfo[];
  readonly startDate: string;
  readonly endDate: string;
  readonly patrimony?: PatrimonySnapshot;
  readonly spendableBalance?: number;
  readonly config?: InsightConfig;
}

export const ICON_MAP = ICON_BY_KIND;

const { windows, thresholds, recurrence } = DEFAULT_INSIGHT_CONFIG;

export const RECURRING_AMOUNT_TOLERANCE_RATIO = recurrence.amountToleranceRatio;

export const RECURRING_ASK_MAX_CONFIDENCE = recurrence.confirmedConfidence;
export const RECURRING_CONFIRMED_CONFIDENCE = recurrence.confirmedConfidence;
export const RECURRING_ASK_MIN_CONFIDENCE = recurrence.priorProbability;
export const MIN_SIGNIFICANT_UNBUDGETED_SPEND = thresholds.significantUnbudgetedSpend;
export const MOVEMENTS_ROUTE = '/movements';
export const MIN_BALANCE_AVERAGE_MONTHS = windows.balanceTrendMinimumMonths;
export const DAYS_PER_WEEK = windows.paceWindowDays;
export const EMERGENCY_FUND_LOOKBACK_MONTHS = windows.emergencyFundLookbackMonths;
export const SUBSCRIPTION_SILENCE_DAYS = windows.subscriptionSilenceDays;
export const CATEGORY_PRESSURE_THRESHOLD = thresholds.categoryPressurePercent;
export const MAX_PRESSURE_BARS = thresholds.maxPressureBars;
export const RETROSPECTIVE_DAY_COUNT = thresholds.retrospectiveTopDays;
export const OUTLIER_WINDOW_DAYS = windows.anomalyWindowDays;
export const MIN_DAYS_FOR_RATIO = thresholds.minElapsedDaysForRatio;
