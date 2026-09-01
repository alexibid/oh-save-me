import {
  buildFilterParams,
  interpolate,
  resolveSuggestion,
  resolveOperationalTask,
  resolveFinancialInsight
} from './suggestion-resolver';
import { AssistantSuggestionTemplate } from '../models/assistant-suggestion.model';
import { OperationalTaskTemplate } from '../models/assistant-task.model';
import { FinancialInsightTemplate } from '../models/financial-insight.model';

describe('suggestion-resolver', () => {
  it('builds filter params correctly', () => {
    const params = buildFilterParams({
      pendingReview: true,
      uncategorized: true,
      amountOutlier: true,
      incomeOnly: true,
      categoryId: 'groceries',
      overspend: true,
      descriptionContains: 'netflix',
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    });

    expect(params['category']).toBe('groceries');
    expect(params['search']).toBe('netflix');
    expect(params['startDate']).toBe('2026-01-01');
    expect(params['endDate']).toBe('2026-01-31');
    expect(params['overspend']).toBe('true');
  });

  it('interpolates template parameters properly', () => {
    const text = interpolate('Hello {name}, you saved {amount}', { name: 'Alex', amount: '100 €' });
    expect(text).toBe('Hello Alex, you saved 100 €');
  });

  it('formats monetary parameters in resolveSuggestion', () => {
    const template: AssistantSuggestionTemplate = {
      id: 'positive_savings',
      kind: 'positive_savings',
      icon: 'piggy-bank',
      questionKey: 'assistantSavingsTitle',
      subtextKey: 'assistantSavingsBody',
      params: { amount: 847.77, income: 2000, expenses: 1152.23 },
      filter: { startDate: '2026-01-01', endDate: '2026-01-31' },
      route: '/movements',
      action: null,
    };

    const translate = (k: string) => k === 'assistantSavingsTitle' ? 'Saved {amount}' : 'Income {income}, spent {expenses}';
    const formatAmount = (v: number) => `${v.toFixed(2)} €`;

    const resolved = resolveSuggestion(template, translate, formatAmount);
    expect(resolved.question).toBe('Saved 847.77 €');
    expect(resolved.subtext).toBe('Income 2000.00 €, spent 1152.23 €');
  });

  it('formats monetary parameters in resolveFinancialInsight', () => {
    const template: FinancialInsightTemplate = {
      id: 'safe_to_spend',
      kind: 'safe_to_spend',
      visualArchetype: 'highlight_metric',
      icon: 'shield-check',
      titleKey: 'title',
      subtextKey: 'subtext',
      params: { amount: 45.5 },
      filter: null,
      route: null,
      action: null,
      payload: { value: 45.5, isPositive: true }
    };

    const resolved = resolveFinancialInsight(template, () => 'Safe: {amount}', (v: number) => `${v} €`);
    expect(resolved.title).toBe('Safe: 45.5 €');
  });
});
