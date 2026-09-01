import { SuggestionEngine } from './suggestion-engine';
import {
  buildFilterParams,
  interpolate,
  resolveSuggestion,
  resolveOperationalTask,
  resolveFinancialInsight,
} from './suggestion-resolver';
import { isUncategorized } from '@domain/shared/transaction-filter.utils';
import { sumExpenses } from '@domain/shared/financial-aggregation.utils';
import { AssistantSuggestionTemplate } from '@domain/models/assistant-suggestion.model';
import { ComparisonBarsPayload, CompositionPayload, HighlightMetricPayload, RetrospectivePayload, RunRatePayload, TrendTablePayload } from '@domain/models/financial-insight.model';
import { Account } from '@domain/models/account';
import { Transaction } from '@domain/models/transaction';
import { Budget } from '@domain/models/budget';
import { CategoryInfo } from '@domain/models/category';

const engine = new SuggestionEngine();

const BASE_ACCOUNT: Account = {
  id: 'acc1',
  kind: 'financial',
  name: 'CGD',
  type: 'bank_account',
  scope: 'individual',
  includeInConsolidatedBalance: true,
  unit: 'EUR',
  updatedAt: 0,
};

const makeTx = (id: string, amount: number, category = 'groceries', extra: Partial<Transaction> = {}): Transaction => ({
  id,
  date: '2026-08-01',
  description: `tx-${id}`,
  amount,
  category,
  ...extra,
});

const DATES = { startDate: '2026-08-01', endDate: '2026-08-31', categories: [] as CategoryInfo[] };

const dayOffset = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const ROLLING_DATES = {
  startDate: dayOffset(30),
  endDate: dayOffset(0),
  categories: [] as CategoryInfo[]
};

const DINING_CATEGORY: CategoryInfo[] = [
  { id: 'dining', name: 'Dining', icon: 'category-restaurant', color: '#059669' }
];

describe('SuggestionEngine', () => {
  describe('no_accounts rule', () => {
    it('returns a no_accounts suggestion when accounts array is empty', () => {
      const result = engine.buildSuggestions({ accounts: [], transactions: [], budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'no_accounts')).toBe(true);
    });

    it('does not suggest no_accounts when at least one account exists', () => {
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: [], budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'no_accounts')).toBe(false);
    });

    it('opens the add-entry chooser instead of routing', () => {
      const result = engine.buildSuggestions({ accounts: [], transactions: [], budgets: [], ...DATES });
      const s = result.find(s => s.kind === 'no_accounts')!;
      expect(s.action).toBe('open_add_entry');
      expect(s.route).toBeNull();
    });
  });

  describe('pending_triage rule', () => {
    it('returns a pending_triage suggestion when transactions have pendingReview', () => {
      const txs = [makeTx('1', -50, 'groceries', { pendingReview: true })];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'pending_triage')).toBe(true);
    });

    it('includes the count in the question params, using the plural key above 1', () => {
      const txs = [
        makeTx('1', -50, 'groceries', { pendingReview: true }),
        makeTx('2', -30, 'food', { pendingReview: true }),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      const s = result.find(s => s.kind === 'pending_triage')!;
      expect(s.params['count']).toBe(2);
      expect(s.questionKey).toBe('assistantPendingTriageOther');
    });

    it('uses the singular key when exactly one transaction is pending', () => {
      const txs = [makeTx('1', -50, 'groceries', { pendingReview: true })];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      const s = result.find(s => s.kind === 'pending_triage')!;
      expect(s.questionKey).toBe('assistantPendingTriageOne');
    });

    it('does not suggest pending_triage when no transaction is pending', () => {
      const txs = [makeTx('1', -50)];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'pending_triage')).toBe(false);
    });
  });

  describe('uncategorized rule', () => {
    it('returns an uncategorized suggestion when a transaction has no category', () => {
      const txs = [makeTx('1', -50, '')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'uncategorized')).toBe(true);
    });

    it('returns an uncategorized suggestion for the "uncategorized" literal category', () => {
      const txs = [makeTx('1', -50, 'uncategorized')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'uncategorized')).toBe(true);
    });

    it('does not suggest uncategorized when all transactions have a real category', () => {
      const txs = [makeTx('1', -50, 'groceries')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'uncategorized')).toBe(false);
    });
  });

  describe('outlier_transactions rule', () => {
    it('detects outlier expense transactions (requires ≥4 expenses)', () => {
      const txs = [
        makeTx('1', -100), makeTx('2', -110),
        makeTx('3', -105), makeTx('4', -2000),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'outlier_transactions')).toBe(true);
    });

    it('does not suggest outliers when fewer than 4 expense transactions exist', () => {
      const txs = [makeTx('1', -100), makeTx('2', -200), makeTx('3', -5000)];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'outlier_transactions')).toBe(false);
    });

    it('does not suggest outliers when all amounts are within normal range', () => {
      const txs = [
        makeTx('1', -100), makeTx('2', -105),
        makeTx('3', -110), makeTx('4', -103),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'outlier_transactions')).toBe(false);
    });
  });

  describe('category_overspend rule', () => {
    it('returns an overspend suggestion when spending exceeds a budget', () => {
      const budget: Budget = { id: 'b1', name: 'Groceries', type: 'category', amount: 200, categoryId: 'groceries' };
      const txs = [makeTx('1', -150, 'groceries'), makeTx('2', -100, 'groceries')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [budget], ...DATES });
      expect(result.some(s => s.kind === 'category_overspend')).toBe(true);
    });

    it('does not suggest overspend when spending is within budget', () => {
      const budget: Budget = { id: 'b1', name: 'Groceries', type: 'category', amount: 300, categoryId: 'groceries' };
      const txs = [makeTx('1', -150, 'groceries'), makeTx('2', -100, 'groceries')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [budget], ...DATES });
      expect(result.some(s => s.kind === 'category_overspend')).toBe(false);
    });
  });

  describe('recurring_expense rule', () => {
    it('detects the same description+amount showing up in 2+ different months, when the automatic classifier is not yet confident enough to have caught it on its own', () => {
      const txs = [
        makeTx('1', -45.5, 'Utilities', { description: 'EDP', date: '2026-07-28' }),
        makeTx('2', -45.5, 'Utilities', { description: 'EDP', date: '2026-08-05' }),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      const s = result.find(s => s.kind === 'recurring_expense');
      expect(s).toBeDefined();
      expect(s!.params['description']).toBe('EDP');
      expect(s!.params['count']).toBe(2);
      expect(s!.filter).toEqual({ descriptionContains: 'EDP' });
    });

    it('is case/whitespace-insensitive when grouping descriptions', () => {
      const txs = [
        makeTx('1', -45.5, 'Utilities', { description: 'EDP  ', date: '2026-07-28' }),
        makeTx('2', -45.5, 'Utilities', { description: ' edp', date: '2026-08-05' }),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'recurring_expense')).toBe(true);
    });

    it('does not flag a description seen in only one month', () => {
      const txs = [
        makeTx('1', -45.5, 'Utilities', { description: 'EDP', date: '2026-08-01' }),
        makeTx('2', -45.5, 'Utilities', { description: 'EDP', date: '2026-08-15' }),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'recurring_expense')).toBe(false);
    });

    it('does not flag amounts that drift too much to be the same subscription', () => {
      const txs = [
        makeTx('1', -45.5, 'Utilities', { description: 'EDP', date: '2026-07-28' }),
        makeTx('2', -180, 'Utilities', { description: 'EDP', date: '2026-08-05' }),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'recurring_expense')).toBe(false);
    });

    it('does not flag a monthly, stable-amount expense the automatic recurring classifier has already recognized with confidence', () => {
      const txs = [
        makeTx('1', -9.99, 'entertainment', { description: 'Netflix', date: '2026-06-05' }),
        makeTx('2', -9.99, 'entertainment', { description: 'Netflix', date: '2026-07-05' }),
        makeTx('3', -9.99, 'entertainment', { description: 'Netflix', date: '2026-08-05' }),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'recurring_expense')).toBe(false);
    });

    it('does not flag a pattern too weak to carry any signal beyond the classifier\'s own base rate', () => {
      const txs = [
        makeTx('1', -9.99, 'entertainment', { description: 'Netflix', date: '2026-07-28' }),
        makeTx('2', -9.99, 'entertainment', { description: 'Netflix', date: '2026-08-05' }),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'recurring_expense')).toBe(false);
    });
  });

  describe('category_needs_budget rule', () => {
    it('flags the biggest unbudgeted category above the significance threshold', () => {
      const txs = [
        makeTx('1', -80, 'dining'),
        makeTx('2', -60, 'dining'),
      ];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES, categories: DINING_CATEGORY });
      const s = result.find(s => s.kind === 'category_needs_budget');
      expect(s).toBeDefined();
      expect(s!.params['categoryId']).toBe('dining');
      expect(s!.filter).toEqual({ categoryId: 'dining' });
      expect(s!.route).toBe('/budget');
    });

    it('still flags a category unknown to the categories list (avoids hiding legitimate spend when the category has not synced yet)', () => {
      const txs = [makeTx('1', -80, 'dining'), makeTx('2', -60, 'dining')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES, categories: [] });
      expect(result.some(s => s.kind === 'category_needs_budget')).toBe(true);
    });

    it('does not flag the legacy AssetPurchase category id, even though it no longer exists in the taxonomy', () => {
      const txs = [makeTx('1', -80, 'AssetPurchase'), makeTx('2', -60, 'AssetPurchase')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES, categories: [] });
      expect(result.some(s => s.kind === 'category_needs_budget')).toBe(false);
    });

    it('does not flag a category that already has a budget', () => {
      const budget: Budget = { id: 'b1', name: 'Dining', type: 'category', amount: 200, categoryId: 'dining' };
      const txs = [makeTx('1', -80, 'dining'), makeTx('2', -60, 'dining')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [budget], ...DATES, categories: DINING_CATEGORY });
      expect(result.some(s => s.kind === 'category_needs_budget')).toBe(false);
    });

    it('does not flag spend below the significance threshold', () => {
      const txs = [makeTx('1', -20, 'dining')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES, categories: DINING_CATEGORY });
      expect(result.some(s => s.kind === 'category_needs_budget')).toBe(false);
    });

    it('ignores uncategorized transactions', () => {
      const txs = [makeTx('1', -150, ''), makeTx('2', -150, 'uncategorized')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES, categories: DINING_CATEGORY });
      expect(result.some(s => s.kind === 'category_needs_budget')).toBe(false);
    });

    it('does not flag an investment-only category, even with significant unbudgeted spend', () => {
      const investmentCategory: CategoryInfo[] = [
        { id: 'Investments', name: 'Investments & Savings', icon: 'category-investments', color: '#4f46e5', accountTypes: ['investment'] }
      ];
      const txs = [makeTx('1', -600, 'Investments')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES, categories: investmentCategory });
      expect(result.some(s => s.kind === 'category_needs_budget')).toBe(false);
    });

    it('does not flag a Transfers category, even with significant unbudgeted spend', () => {
      const txs = [makeTx('1', -600, 'Transfers')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES, categories: DINING_CATEGORY });
      expect(result.some(s => s.kind === 'category_needs_budget')).toBe(false);
    });
  });

  describe('positive_savings rule', () => {
    it('returns a positive_savings suggestion when income exceeds expenses', () => {
      const txs = [makeTx('1', 1500, 'income'), makeTx('2', -600, 'groceries')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      const savings = result.find(s => s.kind === 'positive_savings');
      expect(savings).toBeDefined();
      expect(savings?.params['amount']).toBe(900);
      expect(savings?.params['income']).toBe(1500);
      expect(savings?.params['expenses']).toBe(600);
      expect(savings?.filter).toEqual({ startDate: DATES.startDate, endDate: DATES.endDate });
    });

    it('does not suggest positive_savings when expenses equal or exceed income', () => {
      const txs = [makeTx('1', 1000, 'income'), makeTx('2', -1000, 'groceries')];
      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [], ...DATES });
      expect(result.some(s => s.kind === 'positive_savings')).toBe(false);
    });
  });

  describe('suggestion ordering', () => {
    it('places no_accounts before pending_triage before uncategorized', () => {
      const txs = [
        makeTx('1', -50, '', { pendingReview: true }),
        makeTx('2', -30, ''),
      ];
      const result = engine.buildSuggestions({ accounts: [], transactions: txs, budgets: [], ...DATES });
      const kinds = result.map(s => s.kind);
      expect(kinds.indexOf('no_accounts')).toBeLessThan(kinds.indexOf('pending_triage'));
      expect(kinds.indexOf('pending_triage')).toBeLessThan(kinds.indexOf('uncategorized'));
    });
  });
});

describe('suggestion-engine helpers', () => {
  describe('interpolate()', () => {
    it('substitutes known params', () => {
      expect(interpolate('Tens {count} movimentos', { count: 3 })).toBe('Tens 3 movimentos');
    });

    it('leaves unknown tokens untouched', () => {
      expect(interpolate('Olá {name}', {})).toBe('Olá {name}');
    });
  });

  describe('resolveSuggestion()', () => {
    const template: AssistantSuggestionTemplate = {
      id: 'pending_triage',
      kind: 'pending_triage',
      icon: 'inbox',
      questionKey: 'assistantPendingTriageOther',
      subtextKey: 'assistantPendingTriageBody',
      params: { count: 5 },
      filter: { pendingReview: true },
      route: '/movements',
      action: null,
    };
    const translate = (key: string) => ({
      assistantPendingTriageOther: 'Tens {count} movimentos por rever',
      assistantPendingTriageBody: 'Confirma a categoria antes de fechares o mês',
    })[key] ?? key;

    it('translates and interpolates question and subtext', () => {
      const resolved = resolveSuggestion(template, translate);
      expect(resolved.question).toBe('Tens 5 movimentos por rever');
      expect(resolved.subtext).toBe('Confirma a categoria antes de fechares o mês');
    });

    it('resolves a categoryId param to a display name, exposed as {name}', () => {
      const needsBudgetTemplate: AssistantSuggestionTemplate = {
        ...template,
        kind: 'category_needs_budget',
        questionKey: 'assistantNeedsBudgetTitle',
        params: { categoryId: 'dining' },
      };
      const t = (key: string) => (key === 'assistantNeedsBudgetTitle' ? 'Gastas em {name}' : key);
      const resolved = resolveSuggestion(needsBudgetTemplate, t, undefined, id => (id === 'dining' ? 'Restaurantes' : id));
      expect(resolved.question).toBe('Gastas em Restaurantes');
    });

    it('formats the amount param through the supplied currency formatter', () => {
      const savingsTemplate: AssistantSuggestionTemplate = {
        ...template,
        kind: 'positive_savings',
        questionKey: 'assistantSavingsTitle',
        params: { amount: 120.5 },
      };
      const t = (key: string) => (key === 'assistantSavingsTitle' ? 'Poupaste {amount} este período' : key);
      const resolved = resolveSuggestion(savingsTemplate, t, amount => `${amount.toFixed(2)} €`);
      expect(resolved.question).toBe('Poupaste 120.50 € este período');
    });
  });

  describe('vacation_budget_active rule', () => {
    it('stops calling a trip active once its end date has passed, even when the newest movement is older than today', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10).toLocaleDateString('en-CA');
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3).toLocaleDateString('en-CA');

      const budget: Budget = {
        id: 'vacation1', name: 'Férias Algarve', type: 'project', kind: 'vacation',
        amount: 1000, projectStartDate: start, projectEndDate: end,
      };
      const txs = [
        { id: '1', date: start, description: 'Restaurante Mar', amount: -50, category: 'restaurants' },
        { id: '2', date: end, description: 'Supermercado', amount: -30, category: 'groceries' },
      ] as Transaction[];

      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [budget], ...DATES });

      expect(result.some(res => res.kind === 'vacation_budget_active')).toBe(false);
    });

    it('never reports the same trip as both running and recently ended', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10).toLocaleDateString('en-CA');
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3).toLocaleDateString('en-CA');

      const budget: Budget = {
        id: 'vacation1', name: 'Férias Algarve', type: 'project', kind: 'vacation',
        amount: 1000, projectStartDate: start, projectEndDate: end,
      };
      const txs = [{ id: '1', date: end, description: 'Restaurante Mar', amount: -50, category: 'restaurants' }] as Transaction[];

      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [budget], ...DATES });

      const active = result.some(res => res.kind === 'vacation_budget_active');
      const ended = result.some(res => res.kind === 'vacation_budget_ended');
      expect(active && ended).toBe(false);
    });

    it('still treats a trip as active when the imported data runs ahead of the real clock', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10).toLocaleDateString('en-CA');
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20).toLocaleDateString('en-CA');

      const budget: Budget = {
        id: 'vacation1', name: 'Férias Algarve', type: 'project', kind: 'vacation',
        amount: 1000, projectStartDate: start, projectEndDate: end,
      };
      const txs = [{ id: '1', date: start, description: 'Restaurante Mar', amount: -50, category: 'restaurants' }] as Transaction[];

      const result = engine.buildSuggestions({ accounts: [BASE_ACCOUNT], transactions: txs, budgets: [budget], ...DATES });

      expect(result.some(res => res.kind === 'vacation_budget_active')).toBe(true);
    });

    it('returns vacation_budget_active suggestion when there is an active vacation budget covering today', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toLocaleDateString('en-CA');
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toLocaleDateString('en-CA');

      const budget: Budget = {
        id: 'vacation1',
        name: 'Férias Algarve',
        type: 'project',
        kind: 'vacation',
        amount: 1000,
        projectStartDate: start,
        projectEndDate: end,
      };

      const txs = [
        { id: '1', date: start, description: 'Restaurante Mar', amount: -50, category: 'restaurants' },
        { id: '2', date: start, description: 'Supermercado', amount: -30, category: 'groceries' },
      ] as Transaction[];

      const result = engine.buildSuggestions({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [budget],
        ...DATES,
      });

      const s = result.find(res => res.kind === 'vacation_budget_active');
      expect(s).toBeDefined();
      expect(s?.id).toBe('vacation_budget_active_vacation1');
      expect(s?.params['spent']).toBe(80);
      expect(s?.params['target']).toBe(1000);
    });

    it('filters out recurring transactions from atypical spent calculations', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toLocaleDateString('en-CA');
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toLocaleDateString('en-CA');

      const budget: Budget = {
        id: 'vacation1',
        name: 'Férias Algarve',
        type: 'project',
        kind: 'vacation',
        amount: 1000,
        projectStartDate: start,
        projectEndDate: end,
      };

      const txs = [
        { id: '1', date: start, description: 'Rent', amount: -500, category: 'housing' },
        { id: '2', date: '2026-07-01', description: 'Rent', amount: -500, category: 'housing' },
        { id: '3', date: start, description: 'Restaurante Mar', amount: -50, category: 'restaurants' },
      ] as Transaction[];

      const result = engine.buildSuggestions({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [budget],
        ...DATES,
      });

      const s = result.find(res => res.kind === 'vacation_budget_active')!;
      expect(s.params['spent']).toBe(50);
    });
  });

  describe('vacation_budget_ended rule', () => {
    it('returns vacation_budget_ended suggestion when there is a vacation budget that ended in the past and is not closed', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate() - 10).toLocaleDateString('en-CA');
      const end = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate() - 2).toLocaleDateString('en-CA');

      const budget: Budget = {
        id: 'vacation2',
        name: 'Férias Passadas',
        type: 'project',
        kind: 'vacation',
        amount: 1000,
        projectStartDate: start,
        projectEndDate: end,
        isClosed: false,
      };

      const txs = [
        { id: '1', date: start, description: 'Restaurante Mar', amount: -50, category: 'restaurants' },
        { id: '2', date: start, description: 'Supermercado', amount: -30, category: 'groceries' },
      ] as Transaction[];

      const result = engine.buildSuggestions({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [budget],
        ...DATES,
      });

      const s = result.find(res => res.kind === 'vacation_budget_ended');
      expect(s).toBeDefined();
      expect(s?.id).toBe('vacation_budget_ended_vacation2');
      expect(s?.params['remaining']).toBe(920);
    });
  });

  describe('isUncategorized()', () => {
    const make = (category: string) => ({ id: '1', date: '2026-01-01', description: 'x', amount: -1, category });
    it('flags empty string category', () => expect(isUncategorized(make(''))).toBe(true));
    it('flags literal "uncategorized"', () => expect(isUncategorized(make('uncategorized'))).toBe(true));
    it('flags "Others" category', () => expect(isUncategorized(make('Others'))).toBe(true));
    it('flags "Outros" category', () => expect(isUncategorized(make('Outros'))).toBe(true));
    it('does not flag a real category', () => expect(isUncategorized(make('groceries'))).toBe(false));
  });

  describe('sumExpenses()', () => {
    it('sums absolute values of negative transactions only', () => {
      const txs = [
        { id: '1', date: '', description: '', amount: -100, category: '' },
        { id: '2', date: '', description: '', amount:  500, category: '' },
        { id: '3', date: '', description: '', amount:  -50, category: '' },
      ] as Transaction[];
      expect(sumExpenses(txs)).toBe(150);
    });
  });

  describe('buildFilterParams()', () => {
    it('returns empty object for null filter', () => {
      expect(buildFilterParams(null)).toEqual({});
    });
    it('maps pendingReview to filter=pending_review', () => {
      expect(buildFilterParams({ pendingReview: true })).toEqual({ filter: 'pending_review' });
    });
    it('maps overspend + categoryId', () => {
      expect(buildFilterParams({ categoryId: 'food', overspend: true })).toEqual({ category: 'food', overspend: 'true' });
    });
    it('maps descriptionContains to search', () => {
      expect(buildFilterParams({ descriptionContains: 'Netflix' })).toEqual({ search: 'Netflix' });
    });
  });

  describe('buildOperationalTasks', () => {
    it('returns only operational task kinds and never financial insights', () => {
      const txs = [
        makeTx('1', -50, '', { pendingReview: true }),
        makeTx('2', -200, 'dining'),
        makeTx('3', 1500, 'income'),
      ];
      const result = engine.buildOperationalTasks({
        accounts: [],
        transactions: txs,
        budgets: [],
        ...DATES,
        categories: DINING_CATEGORY,
      });

      const allowedOperationalKinds = new Set([
        'no_accounts',
        'pending_triage',
        'uncategorized',
        'category_needs_budget',
        'duplicate_charge',
        'unmatched_transfer',
        'vacation_budget_ended',
        'confirm_recurring',
        'confirm_salary',
        'broker_transfer',
        'broker_idle_cash',
        'structural_surplus',
        'stale_asset_revaluation',
        'target_profit_reached',
      ]);

      expect(result.length).toBeGreaterThan(0);
      for (const task of result) {
        expect(allowedOperationalKinds.has(task.kind)).toBe(true);
      }
      const rawTasks = result as readonly { kind: string }[];
      expect(rawTasks.some(t => t.kind === 'positive_savings')).toBe(false);
      expect(rawTasks.some(t => t.kind === 'category_overspend')).toBe(false);
    });

    it('detects duplicate charge transactions', () => {
      const txs = [
        makeTx('1', -15.5, 'dining', { description: 'Padaria Portuguesa', date: '2026-08-01' }),
        makeTx('2', -15.5, 'dining', { description: 'Padaria Portuguesa', date: '2026-08-01' }),
      ];
      const result = engine.buildOperationalTasks({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      const dup = result.find(t => t.kind === 'duplicate_charge');
      expect(dup).toBeDefined();
      expect(dup?.action).toBe('open_reconcile_dialog');
    });

    it('detects unmatched transfer transactions', () => {
      const txs = [
        makeTx('1', -200, 'Transfers', { description: 'Transferência para Poupança' }),
      ];
      const result = engine.buildOperationalTasks({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      const transfer = result.find(t => t.kind === 'unmatched_transfer');
      expect(transfer).toBeDefined();
      expect(transfer?.action).toBe('open_reconcile_dialog');
    });

    it('detects target profit reached on investment positions', () => {
      const investmentBudget: Budget = {
        id: 'inv-1',
        name: 'IWDA ETF',
        type: 'investment',
        amount: 1000,
        currentValue: 1250,
        targetProfitPct: 20,
      };
      const result = engine.buildOperationalTasks({
        accounts: [BASE_ACCOUNT],
        transactions: [],
        budgets: [investmentBudget],
        ...DATES,
      });
      const task = result.find(t => t.kind === 'target_profit_reached');
      expect(task).toBeDefined();
      expect(task?.params['name']).toBe('IWDA ETF');
      expect(task?.params['target']).toBe(20);
      expect(task?.answer?.kind).toBe('simulate_sell');
    });
  });

  describe('buildFinancialInsights', () => {
    it('returns only financial insight kinds and never operational tasks', () => {
      const txs = [
        makeTx('1', 2000, 'income'),
        makeTx('2', -50, 'groceries'),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });

      const operationalKinds = new Set([
        'no_accounts',
        'pending_triage',
        'uncategorized',
        'category_needs_budget',
        'duplicate_charge',
        'unmatched_transfer',
        'vacation_budget_ended',
        'confirm_recurring',
      ]);

      expect(result.length).toBeGreaterThan(0);
      for (const insight of result) {
        expect(operationalKinds.has(insight.kind)).toBe(false);
        expect(insight.visualArchetype).toBeDefined();
      }
    });

    it('flags a bill increase on a payment the classifier has recognized as recurring', () => {
      const txs = [
        makeTx('1', -45.5, 'Utilities', { description: 'EDP', date: '2026-06-01' }),
        makeTx('2', -45.5, 'Utilities', { description: 'EDP', date: '2026-07-01' }),
        makeTx('3', -80, 'Utilities', { description: 'EDP', date: '2026-08-01' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      const bill = result.find(i => i.kind === 'bill_increase');
      expect(bill).toBeDefined();
      expect(bill?.visualArchetype).toBe('trend_table');
    });

    it('stays quiet about a payment it cannot yet call a bill, since there is no baseline to compare against', () => {
      const txs = [
        makeTx('1', -30, 'health', { description: 'Ginasio', date: '2026-07-01' }),
        makeTx('2', -55, 'health', { description: 'Ginasio', date: '2026-08-01' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      expect(result.some(i => i.kind === 'bill_increase')).toBe(false);
    });

    it('detects spending velocity when total budget is defined', () => {
      const budget: Budget = { id: 'b1', name: 'Alimentação', type: 'category', amount: 500, categoryId: 'groceries' };
      const txs = [makeTx('1', -200, 'groceries', { date: dayOffset(1) })];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [budget],
        ...ROLLING_DATES,
      });
      const vel = result.find(i => i.kind === 'spending_velocity');
      expect(vel).toBeDefined();
      expect(vel?.visualArchetype).toBe('run_rate');
    });

    it('ignores inactive subscriptions (older than 45 days)', () => {
      const txs = [
        makeTx('1', -15, 'entertainment', { description: 'Netflix', date: '2026-05-01' }),
        makeTx('2', -15, 'entertainment', { description: 'Netflix', date: '2026-06-01' }),
        makeTx('3', -10, 'groceries', { description: 'Supermercado', date: '2026-08-20' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      const subs = result.find(i => i.kind === 'active_subscriptions');
      expect(subs).toBeUndefined();
    });

    it('leaves out a payment the automatic classifier is not yet confident is recurring', () => {
      const txs = [
        makeTx('1', -45.5, 'Utilities', { description: 'EDP', date: '2026-07-28' }),
        makeTx('2', -45.5, 'Utilities', { description: 'EDP', date: '2026-08-05' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      const subs = result.find(i => i.kind === 'active_subscriptions');
      expect(subs).toBeUndefined();
    });

    it('lists a monthly, stable-amount subscription the automatic classifier has recognized with confidence', () => {
      const txs = [
        makeTx('1', -9.99, 'entertainment', { description: 'Netflix', date: '2026-06-05' }),
        makeTx('2', -9.99, 'entertainment', { description: 'Netflix', date: '2026-07-05' }),
        makeTx('3', -9.99, 'entertainment', { description: 'Netflix', date: '2026-08-05' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      const subs = result.find(i => i.kind === 'active_subscriptions');
      expect(subs).toBeDefined();
    });

    it('stays silent instead of offering a safe amount of zero when nothing is left to spend', () => {
      const txs = [
        makeTx('1', 400, 'income', { date: '2026-08-01' }),
        makeTx('2', -900, 'groceries', { date: '2026-08-05' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });

      expect(result.some(i => i.kind === 'safe_to_spend')).toBe(false);
    });

    it('hides the outlier card when the recent window holds nothing unusual', () => {
      const routine = [12, 18, 25, 31, 14, 22, 19, 27].map((amount, i) =>
        makeTx(`old-${i}`, -amount, 'groceries', { date: dayOffset(200 + i), description: 'Pingo Doce' })
      );
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [...routine, makeTx('spike', -900, 'groceries', { date: dayOffset(200), description: 'Fnac' })],
        budgets: [],
        ...ROLLING_DATES,
      });

      expect(result.some(i => i.kind === 'outlier_transactions')).toBe(false);
    });

    it('counts the outliers of the recent window, not of the whole history', () => {
      const routine = [12, 18, 25, 31, 14, 22, 19, 27].map((amount, i) =>
        makeTx(`old-${i}`, -amount, 'groceries', { date: dayOffset(200 + i), description: 'Pingo Doce' })
      );
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [
          ...routine,
          makeTx('old-spike', -900, 'groceries', { date: dayOffset(200), description: 'Fnac' }),
          makeTx('now-spike', -800, 'groceries', { date: dayOffset(10), description: 'Worten' }),
        ],
        budgets: [],
        ...ROLLING_DATES,
      });

      const outlier = result.find(i => i.kind === 'outlier_transactions');
      expect(outlier?.params?.['count']).toBe(1);
      expect(outlier?.titleKey).toBe('assistantOutlierOne');
    });

    it('stays silent on a pace of zero, which says nothing on the first days of a cycle', () => {
      const budget: Budget = { id: 'b1', name: 'Alimentação', type: 'category', amount: 500, categoryId: 'groceries' };
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [makeTx('1', 1200, 'income', { date: '2026-08-01' })],
        budgets: [budget],
        ...DATES,
      });

      expect(result.some(i => i.kind === 'spending_velocity')).toBe(false);
    });

    it('measures the pace over the last seven days, not over the slice of cycle already elapsed', () => {
      const budget: Budget = { id: 'b1', name: 'Alimentação', type: 'category', amount: 500, categoryId: 'groceries' };
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [
          makeTx('recent', -60, 'groceries', { date: dayOffset(2) }),
          makeTx('older', -300, 'groceries', { date: dayOffset(20) }),
        ],
        budgets: [budget],
        startDate: dayOffset(30),
        endDate: dayOffset(0),
        categories: [],
      });

      const velocity = result.find(i => i.kind === 'spending_velocity');
      expect((velocity?.payload as RunRatePayload).currentRate).toBe(60);
    });

    it('leaves envelope spending out of the pace, since that money was already set aside', () => {
      const trip: Budget = { id: 'p1', name: 'Férias', type: 'project', amount: 1000, monthlyAllocation: 1000 };
      const budget: Budget = { id: 'b1', name: 'Alimentação', type: 'category', amount: 500, categoryId: 'groceries' };

      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [
          makeTx('everyday', -60, 'groceries', { date: dayOffset(1) }),
          makeTx('holiday', -400, 'travel', { date: dayOffset(1), budgetId: 'p1' }),
        ],
        budgets: [budget, trip],
        ...ROLLING_DATES,
      });

      const velocity = result.find(i => i.kind === 'spending_velocity');
      expect((velocity?.payload as RunRatePayload).currentRate).toBe(60);
      expect(velocity?.params?.['spent']).toBe(0);
    });

    it('reports the excess once a project spends past what was set aside for it', () => {
      const trip: Budget = { id: 'p1', name: 'Férias', type: 'project', amount: 300, monthlyAllocation: 300 };
      const budget: Budget = { id: 'b1', name: 'Alimentação', type: 'category', amount: 500, categoryId: 'groceries' };

      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [
          makeTx('everyday', -60, 'groceries', { date: dayOffset(1) }),
          makeTx('holiday', -400, 'travel', { date: dayOffset(1), budgetId: 'p1' }),
        ],
        budgets: [budget, trip],
        ...ROLLING_DATES,
      });

      const velocity = result.find(i => i.kind === 'spending_velocity');
      expect(velocity?.params?.['spent']).toBe(100);
      expect(velocity?.subtextKey).toBe('insightsSpendingVelocityWithOverspend');
    });

    it('caps the reference limit at the money that actually exists to spend', () => {
      const budget: Budget = { id: 'b1', name: 'Alimentação', type: 'category', amount: 5000, categoryId: 'groceries' };
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [makeTx('1', -200, 'groceries', { date: dayOffset(1) })],
        budgets: [budget],
        spendableBalance: 800,
        ...ROLLING_DATES,
      });

      const velocity = result.find(i => i.kind === 'spending_velocity');
      expect((velocity?.payload as RunRatePayload).targetAmount).toBe(800);
    });

    it('leaves projects and investment wallets out of the weekly spendable pool', () => {
      const house: Budget = { id: 'w1', name: 'Casa', type: 'investment', kind: 'house', amount: 100000 };
      const trip: Budget = { id: 'p1', name: 'Férias', type: 'project', amount: 1000 };
      const groceries: Budget = { id: 'b1', name: 'Alimentação', type: 'category', amount: 500, categoryId: 'groceries' };
      const txs = [makeTx('1', -100, 'groceries', { date: '2026-08-05' })];

      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [house, trip, groceries],
        ...DATES,
      });

      const safe = result.find(i => i.kind === 'safe_to_spend');
      const weeks = safe?.params?.['weeksRemaining'] as number;
      expect(safe?.params?.['amount']).toBeCloseTo(400 / weeks, 2);
    });

    describe('financial health insights', () => {
      const salary = () => makeTx('salary', 2000, 'Income', { date: '2026-08-02' });

      it('reports what share of the income stayed with the owner', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [salary(), makeTx('rent', -800, 'Housing', { date: '2026-08-03' })],
          budgets: [],
          ...DATES,
        });

        const rate = result.find(i => i.kind === 'savings_rate');
        expect((rate?.payload as HighlightMetricPayload).value).toBe(60);
        expect((rate?.payload as HighlightMetricPayload).unit).toBe('percent');
      });

      it('stays silent about the savings rate when nothing came in', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [makeTx('rent', -800, 'Housing', { date: '2026-08-03' })],
          budgets: [],
          ...DATES,
        });

        expect(result.some(i => i.kind === 'savings_rate')).toBe(false);
      });

      it('separates what had to be paid from what was chosen', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [
            salary(),
            makeTx('rent', -700, 'Housing', { date: '2026-08-03' }),
            makeTx('cinema', -300, 'Entertainment', { date: '2026-08-04' }),
          ],
          budgets: [],
          ...DATES,
        });

        const split = result.find(i => i.kind === 'essential_vs_lifestyle');
        const payload = split?.payload as CompositionPayload;
        expect(payload.slices.map(slice => slice.amount)).toEqual([700, 300]);
        expect(split?.params?.['change']).toBe(30);
      });

      it('says nothing about the split when every euro was a necessity', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [salary(), makeTx('rent', -700, 'Housing', { date: '2026-08-03' })],
          budgets: [],
          ...DATES,
        });

        expect(result.some(i => i.kind === 'essential_vs_lifestyle')).toBe(false);
      });

      it('counts how many months of essentials the balance would cover', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [
            makeTx('m1', -500, 'Housing', { date: '2026-06-03' }),
            makeTx('m2', -500, 'Housing', { date: '2026-07-03' }),
          ],
          budgets: [],
          spendableBalance: 1500,
          ...DATES,
        });

        const fund = result.find(i => i.kind === 'emergency_fund');
        expect((fund?.payload as HighlightMetricPayload).value).toBe(3);
        expect((fund?.payload as HighlightMetricPayload).unit).toBe('months');
      });

      it('counts salary as income and leaves an asset sale out of it', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [
            makeTx('in1', 2000, 'Income', { date: '2026-06-01' }),
            makeTx('sale', 9000, 'AssetSale', { date: '2026-06-02' }),
            makeTx('m1', -500, 'Housing', { date: '2026-06-03' }),
            makeTx('in2', 2000, 'Income', { date: '2026-07-01' }),
            makeTx('m2', -500, 'Housing', { date: '2026-07-03' }),
          ],
          budgets: [],
          spendableBalance: 1500,
          ...DATES,
        });

        const fund = result.find(i => i.kind === 'emergency_fund');
        expect(fund?.params?.['balance']).toBe(2000);
        expect(fund?.filter).toEqual({ incomeOnly: true });
        expect(fund?.params?.['amount']).toBe(500);
        expect(fund?.params?.['remaining']).toBe(1500);
      });

      it('needs a balance before it can say how long it would last', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [makeTx('m1', -500, 'Housing', { date: '2026-06-03' })],
          budgets: [],
          ...DATES,
        });

        expect(result.some(i => i.kind === 'emergency_fund')).toBe(false);
      });

      it('weighs the unavoidable charges against the income', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [
            salary(),
            makeTx('rent', -900, 'Housing', { date: '2026-08-03' }),
            makeTx('cinema', -300, 'Entertainment', { date: '2026-08-04' }),
          ],
          budgets: [],
          ...DATES,
        });

        const ratio = result.find(i => i.kind === 'fixed_cost_ratio');
        expect((ratio?.payload as HighlightMetricPayload).value).toBe(45);
      });
    });

    describe('category pressure', () => {
      const budget = (id: string, categoryId: string, amount: number): Budget =>
        ({ id, name: categoryId, type: 'category', categoryId, amount });

      it('ranks the categories under pressure and marks the ones already over budget', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [
            makeTx('near', -80, 'groceries', { date: '2026-08-03' }),
            makeTx('safe', -10, 'travel', { date: '2026-08-03' }),
            makeTx('over', -150, 'dining', { date: '2026-08-03' }),
          ],
          budgets: [
            budget('b1', 'groceries', 100),
            budget('b2', 'travel', 100),
            budget('b3', 'dining', 100),
          ],
          ...DATES,
        });

        const pressure = result.find(i => i.kind === 'category_pressure');
        const payload = pressure?.payload as ComparisonBarsPayload;

        expect(payload.bars.map(bar => bar.categoryId)).toEqual(['dining', 'groceries']);
        expect(payload.bars[0].isOverBudget).toBe(true);
        expect(payload.bars[1].isOverBudget).toBe(false);
        expect(payload.bars[1].percentage).toBe(80);
        expect(pressure?.params?.['total']).toBe(1);
        expect(pressure?.subtextKey).toBe('insightsCategoryPressureDeviations');
      });

      it('says nothing while every category is comfortably inside its budget', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [makeTx('safe', -10, 'groceries', { date: '2026-08-03' })],
          budgets: [budget('b1', 'groceries', 100)],
          ...DATES,
        });

        expect(result.some(i => i.kind === 'category_pressure')).toBe(false);
      });
    });

    describe('project retrospective', () => {
      const trip: Budget = {
        id: 'p1',
        name: 'Férias Algarve',
        type: 'project',
        kind: 'vacation',
        amount: 1000,
        projectStartDate: '2026-08-01',
        projectEndDate: '2026-08-10',
      };

      const spending = [
        makeTx('d1a', -400, 'travel', { date: '2026-08-02', budgetId: 'p1' }),
        makeTx('d2a', -300, 'travel', { date: '2026-08-03', budgetId: 'p1' }),
        makeTx('d3a', -200, 'travel', { date: '2026-08-04', budgetId: 'p1' }),
        makeTx('d4a', -50, 'travel', { date: '2026-08-05', budgetId: 'p1' }),
      ];

      it('ranks the costliest and the cheapest days of a project that has ended', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: spending,
          budgets: [trip],
          ...DATES,
        });

        const retro = result.find(i => i.kind === 'project_retrospective');
        const payload = retro?.payload as RetrospectivePayload;

        expect(payload.total).toBe(950);
        expect(payload.costliestDays.map(day => day.date)).toEqual(['2026-08-02', '2026-08-03', '2026-08-04']);
        expect(payload.cheapestDays[0].date).toBe('2026-08-05');
        expect(payload.items.length).toBe(4);
      });

      it('tells the owner it came in under the ceiling, and by how much', () => {
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: spending,
          budgets: [trip],
          ...DATES,
        });

        const retro = result.find(i => i.kind === 'project_retrospective');
        expect(retro?.subtextKey).toBe('insightsProjectRetrospectiveUnder');
        expect(retro?.params?.['remaining']).toBe(50);
      });

      it('says nothing about a project that is still running', () => {
        const running: Budget = { ...trip, projectEndDate: '2027-01-01' };
        const result = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: spending,
          budgets: [running],
          ...DATES,
        });

        expect(result.some(i => i.kind === 'project_retrospective')).toBe(false);
      });
    });

    describe('patrimony insights', () => {
      const patrimony = {
        accessible: 1906.09,
        reserved: 180,
        invested: 6086.71,
        property: 35092.94,
        outstandingDebt: 64907.06,
        receivedIncome: 124.5,
        firstIncomeDate: '2025-03-14',
        paidInstalments: 84,
        contractedInstalments: 480,
      };

      const build = (snapshot?: typeof patrimony) => engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: [],
        budgets: [],
        ...DATES,
        patrimony: snapshot,
      });

      it('stays silent about patrimony when no snapshot is supplied', () => {
        expect(build().map(i => i.kind)).not.toContain('patrimony_split');
      });

      it('leaves the net worth headline to the metrics grid rather than the insight deck', () => {
        expect(build(patrimony).map(i => i.kind)).not.toContain('net_worth');
      });

      it('splits the patrimony into reachable, reserved and tied up, and they add to the whole', () => {
        const split = build(patrimony).find(i => i.kind === 'patrimony_split');
        const payload = split?.payload as CompositionPayload;

        expect(payload.slices.map(slice => slice.labelKey)).toEqual([
          'insightsSliceAccessible', 'insightsSliceReserved', 'insightsSliceInvested', 'insightsSliceProperty'
        ]);
        const sliceTotal = payload.slices.reduce((sum, slice) => sum + slice.amount, 0);
        expect(sliceTotal).toBeCloseTo(payload.total, 2);
      });

      it('measures credit progress in instalments paid, never in extrapolated capital', () => {
        const equity = build(patrimony).find(i => i.kind === 'property_equity');
        const payload = equity?.payload as CompositionPayload;

        expect(payload.unit).toBe('count');
        expect(payload.total).toBe(480);
        expect(equity?.params?.['change']).toBe(18);
        expect(equity?.params?.['count']).toBe(84);
      });

      it('breaks down equity and debt per asset when loan-backed budgets exist', () => {
        const budgets = [
          {
            id: 'b-house',
            name: 'Casa Duarte Dos Santos',
            type: 'investment' as const,
            kind: 'house' as const,
            amount: 100000,
            outstandingDebt: 64907.06,
            paidInstalments: 84,
            contractedInstalments: 480,
            isClosed: false
          },
          {
            id: 'b-car',
            name: 'Inster',
            type: 'investment' as const,
            kind: 'car' as const,
            amount: 19500,
            outstandingDebt: 19000,
            paidInstalments: 2,
            contractedInstalments: 120,
            isClosed: false
          }
        ];

        const insights = engine.buildFinancialInsights({
          accounts: [BASE_ACCOUNT],
          transactions: [],
          budgets,
          ...DATES,
          patrimony,
        });

        const equity = insights.find(i => i.kind === 'property_equity');
        const payload = equity?.payload as CompositionPayload;

        expect(payload.unit).toBe('currency');
        expect(payload.items?.length).toBe(2);
        expect(payload.items?.[0].name).toBe('Casa Duarte Dos Santos');
        expect(payload.items?.[0].paidAmount).toBe(35092.94);
        expect(payload.items?.[0].outstandingDebt).toBe(64907.06);
        expect(payload.items?.[1].name).toBe('Inster');
        expect(payload.items?.[1].paidAmount).toBe(500);
        expect(equity?.params['assetsSummary']).toBe('Casa Duarte Dos Santos, Inster');
        expect(equity?.params['paid']).toBe(35592.94);
        expect(equity?.params['debt']).toBe(83907.06);
      });

      it('says nothing about the credit when no instalments were ever contracted', () => {
        const noCredit = build({ ...patrimony, contractedInstalments: 0 });
        expect(noCredit.some(i => i.kind === 'property_equity')).toBe(false);
      });

      it('dates the accumulated income from the first return it can see', () => {
        const income = build(patrimony).find(i => i.kind === 'portfolio_income');
        expect(income?.subtextKey).toBe('insightsPortfolioIncomeSince');
        expect(income?.params?.['since']).toBe('2025-03-14');
      });

      it('reports the income the positions have paid out, and hides the card when none has', () => {
        const income = build(patrimony).find(i => i.kind === 'portfolio_income');
        expect((income?.payload as HighlightMetricPayload).value).toBe(124.5);

        expect(build({ ...patrimony, receivedIncome: 0 }).some(i => i.kind === 'portfolio_income')).toBe(false);
      });
    });

    it('ignores transfers and asset purchases in safe_to_spend income calculation', () => {
      const txs = [
        makeTx('1', 1000, 'income', { date: '2026-08-01' }),
        makeTx('2', 500, 'Transfers', { date: '2026-08-05' }),
        makeTx('3', 300, 'AssetPurchase', { date: '2026-08-10' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });
      const safe = result.find(i => i.kind === 'safe_to_spend');
      const weeklyVal = (safe?.payload as any)?.value as number;
      const weeks = safe?.params?.['weeksRemaining'] as number;
      expect(weeklyVal).toBeCloseTo(1000 / weeks, 2);
    });

    it('does not trigger category overspend alert for project/vacation budgets', () => {
      const projectBudget: Budget = {
        id: 'p1',
        name: 'Férias de Verão',
        type: 'project',
        kind: 'vacation',
        amount: 100,
        categoryId: 'travel',
      };
      const txs = [
        makeTx('1', -150, 'travel', { date: '2026-08-10' }),
      ];
      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [projectBudget],
        ...DATES,
      });
      const overspend = result.find(i => i.kind === 'category_overspend');
      expect(overspend).toBeUndefined();
    });

    it('reports outlier expenses through a single insight, judged against their own category', () => {
      const dailyGroceries = [9, 9, 10, 10, 11, 11, 12, 12, 13, 15].map((amount, i) =>
        makeTx(`grocery-${i}`, -amount, 'groceries', { date: `2026-08-0${(i % 9) + 1}`, description: 'Pingo Doce' })
      );
      const txs = [
        ...dailyGroceries,
        makeTx('spike', -900, 'groceries', { date: '2026-08-10', description: 'Fnac' }),
      ];

      const result = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      });

      const outlierInsights = result.filter(i => i.kind === 'outlier_transactions');
      expect(outlierInsights.length).toBe(1);

      const payload = outlierInsights[0].payload as TrendTablePayload;
      expect(payload.items.length).toBe(1);
      expect(payload.items[0].description).toBe('Fnac');
    });
  });

  describe('resolveOperationalTask & resolveFinancialInsight', () => {
    it('resolves operational task translations and formatters', () => {
      const task = engine.buildOperationalTasks({
        accounts: [],
        transactions: [],
        budgets: [],
        ...DATES,
      })[0];

      const resolved = resolveOperationalTask(task, (key: string) => `translated_${key}`, (amount: number) => `${amount} €`);
      expect(resolved.title.startsWith('translated_')).toBe(true);
      expect(resolved.kind).toBe('no_accounts');
    });

    it('resolves financial insight translations and preserves payload', () => {
      const txs = [makeTx('1', 1000, 'income'), makeTx('2', -200, 'groceries')];
      const insight = engine.buildFinancialInsights({
        accounts: [BASE_ACCOUNT],
        transactions: txs,
        budgets: [],
        ...DATES,
      })[0];

      const resolved = resolveFinancialInsight(insight, (key: string) => `translated_${key}`);
      expect(resolved.visualArchetype).toBe(insight.visualArchetype);
      expect(resolved.payload).toEqual(insight.payload);
    });
  });
});
