import { CompositionSlice, FinancialInsightTemplate } from '../../models/financial-insight.model';
import {
  budgetedEssentials,
  monthlyAverages,
  splitEssentialSpending
} from '@domain/shared/essential-spending.utils';
import { sumExpenses, sumIncome } from '@domain/shared/financial-aggregation.utils';
import { effectiveToday, filterTransactionsByPeriod, periodProgressInDays } from '@domain/shared/transaction-period.utils';
import {
  SuggestionEngineParams,
  ICON_MAP,
  MOVEMENTS_ROUTE,
  EMERGENCY_FUND_LOOKBACK_MONTHS,
  MIN_DAYS_FOR_RATIO,
} from '../suggestion-engine.types';

export function detectSavingsRate({ transactions, startDate, endDate, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
  if (periodProgressInDays(startDate, endDate).elapsed < (config?.thresholds.minElapsedDaysForRatio ?? MIN_DAYS_FOR_RATIO)) return null;

  const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
  const income = sumIncome(periodTxs);
  if (income <= 0) return null;

  const kept = income - sumExpenses(periodTxs);
  const rate = Math.round((kept / income) * 100);

  return {
    id: 'savings_rate',
    kind: 'savings_rate',
    visualArchetype: 'highlight_metric',
    icon: ICON_MAP['savings_rate'],
    titleKey: 'insightsSavingsRateTitle',
    subtextKey: 'insightsSavingsRateBody',
    params: { change: rate, amount: Math.round(kept * 100) / 100 },
    filter: null,
    route: MOVEMENTS_ROUTE,
    action: null,
    payload: {
      value: rate,
      unit: 'percent',
      labelKey: 'insightsSavingsRateLabel',
      isPositive: rate >= 0,
    },
  };
}

export function detectEssentialVsLifestyle({ transactions, startDate, endDate, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
  if (periodProgressInDays(startDate, endDate).elapsed < (config?.thresholds.minElapsedDaysForRatio ?? MIN_DAYS_FOR_RATIO)) return null;

  const split = splitEssentialSpending(filterTransactionsByPeriod(transactions, startDate, endDate), config?.categories);
  const total = split.essential + split.lifestyle;
  if (total <= 0 || split.lifestyle <= 0) return null;

  return {
    id: 'essential_vs_lifestyle',
    kind: 'essential_vs_lifestyle',
    visualArchetype: 'composition',
    icon: ICON_MAP['essential_vs_lifestyle'],
    titleKey: 'insightsEssentialSplitTitle',
    subtextKey: 'insightsEssentialSplitBody',
    params: { change: Math.round((split.lifestyle / total) * 100) },
    filter: null,
    route: MOVEMENTS_ROUTE,
    action: null,
    payload: {
      total: Math.round(total * 100) / 100,
      unit: 'currency',
      slices: [
        { labelKey: 'insightsSliceEssential', amount: split.essential, tone: 'committed' },
        { labelKey: 'insightsSliceLifestyle', amount: split.lifestyle, tone: 'owned' },
      ] as readonly CompositionSlice[],
    },
  };
}

export function detectEmergencyFund({ transactions, budgets, spendableBalance, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
  if (spendableBalance === undefined || spendableBalance <= 0) return null;

  const averages = monthlyAverages(
    transactions,
    config?.windows.emergencyFundLookbackMonths ?? EMERGENCY_FUND_LOOKBACK_MONTHS,
    effectiveToday(transactions).slice(0, 7),
    config?.categories
  );
  const planned = budgetedEssentials(budgets, config?.categories);
  const essentials = planned > 0 ? planned : averages.essentials;
  if (essentials <= 0) return null;

  const surplus = Math.round((averages.income - essentials) * 100) / 100;
  const months = Math.round((spendableBalance / essentials) * 10) / 10;

  return {
    id: 'emergency_fund',
    kind: 'emergency_fund',
    visualArchetype: 'highlight_metric',
    icon: ICON_MAP['emergency_fund'],
    titleKey: 'insightsEmergencyFundTitle',
    subtextKey: surplus > 0
      ? 'insightsEmergencyFundBody'
      : 'insightsEmergencyFundNoSurplus',
    params: {
      amount: essentials,
      balance: averages.income,
      remaining: Math.abs(surplus),
    },
    filter: { incomeOnly: true },
    route: MOVEMENTS_ROUTE,
    actionLabelKey: 'insightsActionReviewIncome',
    action: null,
    payload: {
      value: months,
      unit: 'months',
      labelKey: 'insightsEmergencyFundLabel',
      isPositive: months >= 3,
    },
  };
}

export function detectFixedCostRatio({ transactions, startDate, endDate, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
  if (periodProgressInDays(startDate, endDate).elapsed < (config?.thresholds.minElapsedDaysForRatio ?? MIN_DAYS_FOR_RATIO)) return null;

  const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
  const income = sumIncome(periodTxs);
  if (income <= 0) return null;

  const essentials = splitEssentialSpending(periodTxs, config?.categories).essential;
  if (essentials <= 0) return null;

  const ratio = Math.round((essentials / income) * 100);

  return {
    id: 'fixed_cost_ratio',
    kind: 'fixed_cost_ratio',
    visualArchetype: 'highlight_metric',
    icon: ICON_MAP['fixed_cost_ratio'],
    titleKey: 'insightsFixedCostRatioTitle',
    subtextKey: 'insightsFixedCostRatioBody',
    params: { amount: essentials },
    filter: null,
    route: MOVEMENTS_ROUTE,
    action: null,
    payload: {
      value: ratio,
      unit: 'percent',
      labelKey: 'insightsFixedCostRatioLabel',
      isPositive: ratio <= 60,
    },
  };
}
