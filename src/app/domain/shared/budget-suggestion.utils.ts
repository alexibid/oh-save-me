import { DEFAULT_INSIGHT_CONFIG } from '@domain/services/insight-config';
export interface SuggestedCategoryBudget {
  readonly average: number;
  readonly includedMonths: number;
  readonly excludedOutlierMonths: number;
  readonly activeMonthsCount?: number;
}

export interface ClassifiedValue {
  readonly value: number;
  readonly isOutlier: boolean;
}

const MIN_VALUES_FOR_OUTLIER_REMOVAL = DEFAULT_INSIGHT_CONFIG.thresholds.minSamplesForSpread;

export function classifyOutliers(values: readonly number[]): readonly ClassifiedValue[] {
  if (values.length < MIN_VALUES_FOR_OUTLIER_REMOVAL) {
    return values.map(value => ({ value, isOutlier: false }));
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return values.map(value => ({ value, isOutlier: value < lowerBound || value > upperBound }));
}

export function computeSuggestedCategoryBudget(monthlyTotals: readonly number[]): SuggestedCategoryBudget {
  if (monthlyTotals.length === 0) {
    return { average: 0, includedMonths: 0, excludedOutlierMonths: 0 };
  }

  const classified = classifyOutliers(monthlyTotals);
  const included = classified.filter(c => !c.isOutlier).map(c => c.value);

  return {
    average: average(included.length > 0 ? included : monthlyTotals),
    includedMonths: included.length,
    excludedOutlierMonths: monthlyTotals.length - included.length
  };
}

export function computeSuggestedCategoryBudgetFromMovements(
  movements: readonly { readonly value: number; readonly monthKey: string }[]
): SuggestedCategoryBudget {
  if (movements.length === 0) {
    return { average: 0, includedMonths: 0, excludedOutlierMonths: 0 };
  }

  const monthlyTotalsMap = new Map<string, number>();
  for (const m of movements) {
    monthlyTotalsMap.set(m.monthKey, (monthlyTotalsMap.get(m.monthKey) ?? 0) + m.value);
  }

  const monthKeys = Array.from(monthlyTotalsMap.keys()).sort();
  const monthValues = monthKeys.map(k => (monthlyTotalsMap.get(k) ?? 0));

  const classifiedMonths = classifyOutliers(monthValues);

  const nonOutlierMonthKeys: string[] = [];
  const outlierMonthKeys: string[] = [];
  classifiedMonths.forEach((c, index) => {
    if (c.isOutlier) {
      outlierMonthKeys.push(monthKeys[index]);
    } else {
      nonOutlierMonthKeys.push(monthKeys[index]);
    }
  });

  const activeMonths = nonOutlierMonthKeys.length || 1;
  const totalSpend = nonOutlierMonthKeys.reduce((sum, k) => sum + (monthlyTotalsMap.get(k) ?? 0), 0);
  const historicalAvg = totalSpend / activeMonths;

  let suggestedAvg = historicalAvg;
  if (nonOutlierMonthKeys.length > 6) {
    const recent6Keys = nonOutlierMonthKeys.slice(-6);
    const recentSpend = recent6Keys.reduce((sum, k) => sum + (monthlyTotalsMap.get(k) ?? 0), 0);
    const recent6Avg = recentSpend / recent6Keys.length;
    suggestedAvg = 0.70 * recent6Avg + 0.30 * historicalAvg;
  }

  return {
    average: round2(suggestedAvg),
    includedMonths: nonOutlierMonthKeys.length,
    excludedOutlierMonths: outlierMonthKeys.length,
    activeMonthsCount: activeMonths
  };
}

export function computeAverageForSelection(
  values: readonly { readonly value: number; readonly included: boolean; readonly monthKey?: string }[],
  overrideActiveMonthsCount?: number
): SuggestedCategoryBudget {
  const included = values.filter(v => v.included);
  const excluded = values.length - included.length;

  if (included.length === 0) {
    const res: SuggestedCategoryBudget = { average: 0, includedMonths: 0, excludedOutlierMonths: excluded };
    return overrideActiveMonthsCount !== undefined ? { ...res, activeMonthsCount: overrideActiveMonthsCount } : res;
  }

  const byMonth = new Map<string, number>();
  for (const v of included) {
    if (v.monthKey) {
      byMonth.set(v.monthKey, (byMonth.get(v.monthKey) ?? 0) + v.value);
    }
  }

  const monthKeys = Array.from(byMonth.keys()).sort();
  const activeMonths = overrideActiveMonthsCount ?? (monthKeys.length > 0 ? monthKeys.length : included.length);
  const totalSpend = included.reduce((acc, v) => acc + v.value, 0);
  const historicalAvg = totalSpend / Math.max(1, activeMonths);

  let suggestedAvg = historicalAvg;
  if (monthKeys.length > 6) {
    const recent6Keys = monthKeys.slice(-6);
    const recentSpend = recent6Keys.reduce((sum, k) => sum + (byMonth.get(k) ?? 0), 0);
    const recent6Avg = recentSpend / recent6Keys.length;
    suggestedAvg = 0.70 * recent6Avg + 0.30 * historicalAvg;
  }

  const result: SuggestedCategoryBudget = {
    average: round2(suggestedAvg),
    includedMonths: included.length,
    excludedOutlierMonths: excluded
  };

  return overrideActiveMonthsCount !== undefined ? { ...result, activeMonthsCount: overrideActiveMonthsCount } : result;
}

function average(values: readonly number[]): number {
  const sum = values.reduce((acc, v) => acc + v, 0);
  return round2(sum / values.length);
}

function quantile(sortedValues: readonly number[], q: number): number {
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sortedValues[base + 1] !== undefined
    ? sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base])
    : sortedValues[base];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
