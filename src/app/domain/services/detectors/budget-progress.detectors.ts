import {
  ComparisonBar,
  FinancialInsightTemplate,
  RetrospectiveDay,
} from '../../models/financial-insight.model';
import { sumExpenses } from '@domain/shared/financial-aggregation.utils';
import { filterTransactionsByPeriod } from '@domain/shared/transaction-period.utils';
import {
  SuggestionEngineParams,
  ICON_MAP,
  MOVEMENTS_ROUTE,
  CATEGORY_PRESSURE_THRESHOLD,
  MAX_PRESSURE_BARS,
  RETROSPECTIVE_DAY_COUNT,
} from '../suggestion-engine.types';

export function detectCategoryPressure({ transactions, budgets, categories, startDate, endDate, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
  const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
  const categoryName = new Map(categories.map(category => [category.id, category.name]));

  const pressureThreshold = config?.thresholds.categoryPressurePercent ?? CATEGORY_PRESSURE_THRESHOLD;
  const bars: ComparisonBar[] = [];
  for (const budget of budgets) {
    if (budget.type !== 'category' || !budget.categoryId || budget.amount <= 0) continue;

    const spent = sumExpenses(periodTxs.filter(t => t.category === budget.categoryId));
    const percentage = Math.round((spent / budget.amount) * 100);
    if (percentage < pressureThreshold) continue;

    bars.push({
      label: categoryName.get(budget.categoryId) ?? budget.name,
      categoryId: budget.categoryId,
      percentage,
      spent,
      target: budget.amount,
      isOverBudget: percentage > 100,
    });
  }

  if (bars.length === 0) return null;

  const ranked = [...bars]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, config?.thresholds.maxPressureBars ?? MAX_PRESSURE_BARS);

  return {
    id: 'category_pressure',
    kind: 'category_pressure',
    visualArchetype: 'comparison_bars',
    icon: ICON_MAP['category_pressure'],
    titleKey: 'insightsCategoryPressureTitle',
    subtextKey: ranked.some(bar => bar.isOverBudget)
      ? 'insightsCategoryPressureDeviations'
      : (ranked.length === 1 ? 'insightsCategoryPressureOne' : 'insightsCategoryPressureBody'),
    params: {
      count: ranked.length,
      change: pressureThreshold,
      total: ranked.filter(bar => bar.isOverBudget).length,
    },
    filter: { categoryId: ranked[0].categoryId },
    route: MOVEMENTS_ROUTE,
    action: null,
    payload: { bars: ranked, threshold: CATEGORY_PRESSURE_THRESHOLD },
  };
}

export function detectProjectRetrospective({ transactions, budgets, endDate, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
  const finished = budgets.find(budget =>
    budget.type === 'project' && !!budget.projectEndDate && budget.projectEndDate <= endDate
  );
  if (!finished) return null;

  const spending = transactions.filter(t => t.amount < 0 && t.budgetId === finished.id && t.date);
  if (spending.length === 0) return null;

  const byDay = new Map<string, number>();
  for (const transaction of spending) {
    byDay.set(transaction.date, (byDay.get(transaction.date) ?? 0) + Math.abs(transaction.amount));
  }

  const topDays = config?.thresholds.retrospectiveTopDays ?? RETROSPECTIVE_DAY_COUNT;
  const days: RetrospectiveDay[] = [...byDay.entries()]
    .map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const total = Math.round(spending.reduce((sum, t) => sum + Math.abs(t.amount), 0) * 100) / 100;

  return {
    id: `project_retrospective_${finished.id}`,
    kind: 'project_retrospective',
    visualArchetype: 'retrospective',
    icon: ICON_MAP['project_retrospective'],
    titleKey: 'insightsProjectRetrospectiveTitle',
    subtextKey: total > finished.amount
      ? 'insightsProjectRetrospectiveOver'
      : 'insightsProjectRetrospectiveUnder',
    params: {
      name: finished.name,
      amount: total,
      target: finished.amount,
      remaining: Math.round(Math.abs(total - finished.amount) * 100) / 100,
    },
    filter: null,
    route: '/budget',
    actionLabelKey: 'insightsActionViewBudget',
    action: null,
    payload: {
      projectId: finished.id,
      total,
      target: finished.amount,
      costliestDays: days.slice(0, topDays),
      cheapestDays: [...days].reverse().slice(0, topDays),
      items: spending
        .map(t => ({ description: t.description, date: t.date, amount: Math.abs(t.amount) }))
        .sort((a, b) => b.amount - a.amount),
    },
  };
}
