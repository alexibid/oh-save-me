import { CategoryType } from '@domain/models/category';
import { DEFAULT_CARD_SETTINGS } from './insight-registry';
import { SuggestionKind } from '@domain/models/assistant-suggestion.model';
import { AssistantTaskKind } from '@domain/models/assistant-task.model';
import { FinancialInsightKind } from '@domain/models/financial-insight.model';

export type InsightCardKind = SuggestionKind | AssistantTaskKind | FinancialInsightKind;

export interface ObservationWindows {
  readonly paceWindowDays: number;
  readonly anomalyWindowDays: number;
  readonly subscriptionSilenceDays: number;
  readonly emergencyFundLookbackMonths: number;
  readonly balanceTrendMinimumMonths: number;
  readonly balanceTrendSmoothingMonths: number;
  readonly balanceTrendCentreDay: number;
}

export interface InsightThresholds {
  readonly minElapsedDaysForRatio: number;
  readonly categoryPressurePercent: number;
  readonly maxPressureBars: number;
  readonly retrospectiveTopDays: number;
  readonly significantUnbudgetedSpend: number;
  readonly anomalyMultipleOfCategoryMedian: number;
  readonly minSamplesForSpread: number;
}

export interface RecurrenceTuning {
  readonly priorProbability: number;
  readonly confirmedConfidence: number;
  readonly amountToleranceRatio: number;
}

export interface CategoryRoles {
  readonly essential: readonly CategoryType[];
  readonly salary: CategoryType;
}

export interface CardSettings {
  readonly enabled: boolean;
  readonly cooldownHours: number;
}

export type CardSettingsByKind = Readonly<Record<InsightCardKind, CardSettings>>;

export interface InsightConfig {
  readonly windows: ObservationWindows;
  readonly thresholds: InsightThresholds;
  readonly recurrence: RecurrenceTuning;
  readonly categories: CategoryRoles;
  readonly cards: CardSettingsByKind;
}

export const DEFAULT_INSIGHT_CONFIG: InsightConfig = {
  windows: {
    paceWindowDays: 7,
    anomalyWindowDays: 90,
    subscriptionSilenceDays: 45,
    emergencyFundLookbackMonths: 6,
    balanceTrendMinimumMonths: 2,
    balanceTrendSmoothingMonths: 2,
    balanceTrendCentreDay: 15,
  },
  thresholds: {
    minElapsedDaysForRatio: 7,
    categoryPressurePercent: 75,
    maxPressureBars: 5,
    retrospectiveTopDays: 3,
    significantUnbudgetedSpend: 100,
    anomalyMultipleOfCategoryMedian: 2,
    minSamplesForSpread: 4,
  },
  recurrence: {
    priorProbability: 0.15,
    confirmedConfidence: 0.5,
    amountToleranceRatio: 0.15,
  },
  categories: {
    essential: [
      'Housing',
      'Utilities',
      'Groceries',
      'Transportation',
      'Healthcare',
      'Education',
      'Taxes',
      'Credit',
      'Kids'
    ],
    salary: 'Income',
  },
  cards: DEFAULT_CARD_SETTINGS,
};

export interface InsightConfigOverrides {
  readonly windows?: Partial<ObservationWindows>;
  readonly thresholds?: Partial<InsightThresholds>;
  readonly recurrence?: Partial<RecurrenceTuning>;
  readonly categories?: Partial<CategoryRoles>;
  readonly cards?: Partial<Record<InsightCardKind, Partial<CardSettings>>>;
}

export function mergeInsightConfig(
  base: InsightConfig,
  overrides: InsightConfigOverrides
): InsightConfig {
  return {
    windows: { ...base.windows, ...overrides.windows },
    thresholds: { ...base.thresholds, ...overrides.thresholds },
    recurrence: { ...base.recurrence, ...overrides.recurrence },
    categories: { ...base.categories, ...overrides.categories },
    cards: mergeCardSettings(base.cards, overrides.cards),
  };
}

function mergeCardSettings(
  base: CardSettingsByKind,
  overrides: Partial<Record<InsightCardKind, Partial<CardSettings>>> = {}
): CardSettingsByKind {
  const merged = { ...base } as Record<InsightCardKind, CardSettings>;

  for (const [kind, settings] of Object.entries(overrides) as [InsightCardKind, Partial<CardSettings>][]) {
    merged[kind] = { ...merged[kind], ...settings };
  }

  return merged;
}
