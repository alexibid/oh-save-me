import {
  AssistantSuggestion,
  AssistantSuggestionTemplate,
  TransactionFilter,
} from '../models/assistant-suggestion.model';
import { OperationalTask, OperationalTaskTemplate } from '../models/assistant-task.model';
import { FinancialInsight, FinancialInsightTemplate } from '../models/financial-insight.model';

const MONETARY_PARAMS = [
  'amount', 'spent', 'target', 'balance', 'remaining', 'total', 'currentRate', 'recommendedRate', 'suggestedAmount', 'income', 'expenses', 'paid', 'debt'
] as const;

export function buildFilterParams(filter: TransactionFilter | null): Record<string, string> {
  if (!filter) return {};
  const params: Record<string, string> = {};
  if (filter.pendingReview) params['filter'] = 'pending_review';
  if (filter.uncategorized) params['filter'] = 'uncategorized';
  if (filter.amountOutlier) params['filter'] = 'outlier';
  if (filter.incomeOnly)    params['filter'] = 'income';
  if (filter.categoryId)    params['category'] = filter.categoryId;
  if (filter.overspend)     params['overspend'] = 'true';
  if (filter.descriptionContains) params['search'] = filter.descriptionContains;
  if (filter.startDate)     params['startDate'] = filter.startDate;
  if (filter.endDate)       params['endDate'] = filter.endDate;
  return params;
}

export function interpolate(template: string, params: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

export function resolveSuggestion(
  template: AssistantSuggestionTemplate,
  translate: (key: string) => string,
  formatAmount: (amount: number) => string = String,
  getCategoryName: (categoryId: string) => string = id => id
): AssistantSuggestion {
  const params = resolveParams(template.params, formatAmount, getCategoryName);

  return {
    id: template.id,
    kind: template.kind,
    icon: template.icon,
    question: interpolate(translate(template.questionKey), params),
    subtext: interpolate(translate(template.subtextKey), params),
    filter: template.filter,
    route: template.route,
    action: template.action,
  };
}

function resolveParams(
  params: Readonly<Record<string, string | number>>,
  formatAmount: (amount: number) => string,
  getCategoryName: (categoryId: string) => string
): Record<string, string | number> {
  const resolved: Record<string, string | number> = { ...params };

  for (const name of MONETARY_PARAMS) {
    const value = params[name];
    if (typeof value === 'number') resolved[name] = formatAmount(value);
  }

  const categoryId = params['categoryId'];
  if (typeof categoryId === 'string') resolved['name'] = getCategoryName(categoryId);

  return resolved;
}

export function resolveOperationalTask(
  template: OperationalTaskTemplate,
  translate: (key: string) => string,
  formatAmount: (amount: number) => string = String,
  getCategoryName: (categoryId: string) => string = id => id
): OperationalTask {
  const params = resolveParams(template.params, formatAmount, getCategoryName);

  return {
    id: template.id,
    kind: template.kind,
    icon: template.icon,
    title: interpolate(translate(template.titleKey), params),
    subtext: interpolate(translate(template.subtextKey), params),
    targetId: typeof template.params['transactionId'] === 'string'
      ? template.params['transactionId']
      : typeof template.params['budgetId'] === 'string'
        ? template.params['budgetId']
        : typeof template.params['accountId'] === 'string'
          ? template.params['accountId']
          : undefined,
    filter: template.filter,
    route: template.route,
    action: template.action,
    answer: template.answer,
  };
}

export function resolveFinancialInsight(
  template: FinancialInsightTemplate,
  translate: (key: string) => string,
  formatAmount: (amount: number) => string = String,
  getCategoryName: (categoryId: string) => string = id => id
): FinancialInsight {
  const params = resolveParams(template.params, formatAmount, getCategoryName);

  return {
    id: template.id,
    kind: template.kind,
    visualArchetype: template.visualArchetype,
    icon: template.icon,
    title: interpolate(translate(template.titleKey), params),
    subtext: interpolate(translate(template.subtextKey), params),
    actionLabelKey: template.actionLabelKey,
    filter: template.filter,
    route: template.route,
    action: template.action,
    payload: template.payload,
  };
}
