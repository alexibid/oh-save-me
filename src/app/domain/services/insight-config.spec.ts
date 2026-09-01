import { SuggestionEngine } from './suggestion-engine';
import { DEFAULT_INSIGHT_CONFIG, InsightConfig, mergeInsightConfig } from './insight-config';
import { INSIGHT_REGISTRY } from './insight-registry';
import { ComparisonBarsPayload, TrendTablePayload } from '@domain/models/financial-insight.model';
import { Account } from '@domain/models/account';
import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';

const engine = new SuggestionEngine();

const ACCOUNT: Account = {
  id: 'acc1',
  kind: 'financial',
  name: 'CGD',
  type: 'bank_account',
  scope: 'individual',
  includeInConsolidatedBalance: true,
  unit: 'EUR',
  updatedAt: 0,
};

const dayOffset = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const DATES = {
  startDate: dayOffset(30),
  endDate: dayOffset(0),
  categories: [] as CategoryInfo[]
};

const spend = (id: string, amount: number, days: number, category = 'groceries'): Transaction => ({
  id,
  date: dayOffset(days),
  description: id,
  amount,
  category,
});

const tuned = (overrides: Parameters<typeof mergeInsightConfig>[1]): InsightConfig =>
  mergeInsightConfig(DEFAULT_INSIGHT_CONFIG, overrides);

describe('InsightConfig', () => {
  it('keeps every default that a tuning does not mention', () => {
    const config = tuned({ windows: { anomalyWindowDays: 30 } });

    expect(config.windows.anomalyWindowDays).toBe(30);
    expect(config.windows.paceWindowDays).toBe(DEFAULT_INSIGHT_CONFIG.windows.paceWindowDays);
    expect(config.thresholds).toEqual(DEFAULT_INSIGHT_CONFIG.thresholds);
  });

  it('narrows which anomalies reach the deck when the window is shortened', () => {
    const routine = [12, 18, 25, 31, 14, 22, 19, 27].map((amount, i) => spend(`r-${i}`, -amount, 120 + i));
    const transactions = [
      ...routine,
      spend('old-spike', -900, 60),
      spend('recent-spike', -800, 5),
    ];

    const wide = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES,
      config: tuned({ windows: { anomalyWindowDays: 90 } })
    });
    const narrow = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES,
      config: tuned({ windows: { anomalyWindowDays: 10 } })
    });

    const countOf = (result: readonly { kind: string; payload: unknown }[]): number => {
      const card = result.find(i => i.kind === 'outlier_transactions');
      return card ? (card.payload as TrendTablePayload).items.length : 0;
    };

    expect(countOf(wide)).toBe(2);
    expect(countOf(narrow)).toBe(1);
  });

  it('changes which categories count as under pressure when the threshold moves', () => {
    const budget: Budget = { id: 'b1', name: 'Groceries', type: 'category', categoryId: 'groceries', amount: 100 };
    const transactions = [spend('half', -50, 3)];

    const strict = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [budget], ...DATES,
      config: tuned({ thresholds: { categoryPressurePercent: 40 } })
    });
    const relaxed = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [budget], ...DATES,
      config: tuned({ thresholds: { categoryPressurePercent: 90 } })
    });

    const bars = strict.find(i => i.kind === 'category_pressure')?.payload as ComparisonBarsPayload;
    expect(bars.bars[0].percentage).toBe(50);
    expect(relaxed.some(i => i.kind === 'category_pressure')).toBe(false);
  });

  it('silences the ratio cards until the period has run long enough', () => {
    const transactions = [
      spend('salary', 2000, 3, 'Income'),
      spend('rent', -800, 2, 'Housing'),
    ];

    const demanding = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES,
      config: tuned({ thresholds: { minElapsedDaysForRatio: 90 } })
    });
    const permissive = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES,
      config: tuned({ thresholds: { minElapsedDaysForRatio: 1 } })
    });

    expect(demanding.some(i => i.kind === 'savings_rate')).toBe(false);
    expect(permissive.some(i => i.kind === 'savings_rate')).toBe(true);
  });

  it('reclassifies spending when a category changes side', () => {
    const transactions = [
      spend('salary', 2000, 3, 'Income'),
      spend('dinner', -300, 2, 'Restaurants'),
      spend('rent', -700, 2, 'Housing'),
    ];

    const withDiningEssential = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES,
      config: tuned({ categories: { essential: ['Housing', 'Restaurants'] } })
    });

    expect(withDiningEssential.some(i => i.kind === 'essential_vs_lifestyle')).toBe(false);
  });

  it('takes a card out of the deck when it is switched off', () => {
    const transactions = [
      spend('salary', 2000, 3, 'Income'),
      spend('rent', -800, 2, 'Housing'),
      spend('dinner', -200, 2, 'Restaurants'),
    ];

    const on = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES,
      config: tuned({ thresholds: { minElapsedDaysForRatio: 1 } })
    });
    const off = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES,
      config: tuned({
        thresholds: { minElapsedDaysForRatio: 1 },
        cards: { savings_rate: { enabled: false } }
      })
    });

    expect(on.some(i => i.kind === 'savings_rate')).toBe(true);
    expect(off.some(i => i.kind === 'savings_rate')).toBe(false);
    expect(off.some(i => i.kind === 'essential_vs_lifestyle')).toBe(true);
  });

  it('lists every card the registry declares, with a channel and an icon', () => {
    for (const definition of INSIGHT_REGISTRY) {
      expect(definition.icon.length).toBeGreaterThan(0);
      expect(DEFAULT_INSIGHT_CONFIG.cards[definition.kind]).toBeDefined();
    }
  });

  it('falls back to the defaults when no configuration is supplied', () => {
    const transactions = [spend('salary', 2000, 3, 'Income'), spend('rent', -800, 2, 'Housing')];

    const result = engine.buildFinancialInsights({
      accounts: [ACCOUNT], transactions, budgets: [], ...DATES
    });

    expect(result.length).toBeGreaterThan(0);
  });
});
