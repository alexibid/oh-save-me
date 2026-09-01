import { CardSettings, InsightCardKind } from './insight-config';

export type InsightChannel = 'insight' | 'task' | 'suggestion';

export interface InsightDefinition {
  readonly kind: InsightCardKind;
  readonly channel: InsightChannel;
  readonly icon: string;
  readonly enabled: boolean;
  readonly cooldownHours: number;
}

const HOUR = 1;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export const INSIGHT_REGISTRY: readonly InsightDefinition[] = [
  { kind: 'safe_to_spend',          channel: 'insight',    icon: 'wallet',               enabled: true, cooldownHours: 12 },
  { kind: 'spending_velocity',      channel: 'insight',    icon: 'spending-analytics',   enabled: true, cooldownHours: 12 },
  { kind: 'grocery_forecast',       channel: 'insight',    icon: 'checklist',            enabled: true, cooldownHours: DAY },
  { kind: 'category_overspend',     channel: 'insight',    icon: 'status-warning',       enabled: true, cooldownHours: 12 },
  { kind: 'category_pressure',      channel: 'insight',    icon: 'budget',               enabled: true, cooldownHours: 12 },
  { kind: 'outlier_transactions',   channel: 'insight',    icon: 'spending-analytics',   enabled: true, cooldownHours: DAY },
  { kind: 'active_subscriptions',   channel: 'insight',    icon: 'sync-alt',             enabled: true, cooldownHours: WEEK },
  { kind: 'bill_increase',          channel: 'insight',    icon: 'status-warning',       enabled: true, cooldownHours: WEEK },
  { kind: 'positive_savings',       channel: 'insight',    icon: 'piggy-bank',           enabled: true, cooldownHours: WEEK },
  { kind: 'savings_rate',           channel: 'insight',    icon: 'piggy-bank',           enabled: true, cooldownHours: WEEK },
  { kind: 'essential_vs_lifestyle', channel: 'insight',    icon: 'spending-analytics',   enabled: true, cooldownHours: WEEK },
  { kind: 'emergency_fund',         channel: 'insight',    icon: 'wallet',               enabled: true, cooldownHours: WEEK },
  { kind: 'fixed_cost_ratio',       channel: 'insight',    icon: 'status-warning',       enabled: true, cooldownHours: WEEK },
  { kind: 'balance_average',        channel: 'insight',    icon: 'spending-analytics',   enabled: true, cooldownHours: 12 },
  { kind: 'patrimony_split',        channel: 'insight',    icon: 'wallet',               enabled: true, cooldownHours: 12 },
  { kind: 'property_equity',        channel: 'insight',    icon: 'budget',               enabled: true, cooldownHours: 12 },
  { kind: 'portfolio_income',       channel: 'insight',    icon: 'piggy-bank',           enabled: true, cooldownHours: 12 },
  { kind: 'project_retrospective',  channel: 'insight',    icon: 'category-travel',      enabled: true, cooldownHours: MONTH },
  { kind: 'vacation_budget_active', channel: 'insight',    icon: 'category-travel',      enabled: true, cooldownHours: 12 },

  { kind: 'no_accounts',            channel: 'task',       icon: 'wallet',               enabled: true, cooldownHours: 0 },
  { kind: 'pending_triage',         channel: 'task',       icon: 'checklist',            enabled: true, cooldownHours: 4 },
  { kind: 'uncategorized',          channel: 'task',       icon: 'manage-categories',    enabled: true, cooldownHours: 4 },
  { kind: 'category_needs_budget',  channel: 'task',       icon: 'budget',               enabled: true, cooldownHours: 12 },
  { kind: 'duplicate_charge',       channel: 'task',       icon: 'status-warning',       enabled: true, cooldownHours: 12 },
  { kind: 'unmatched_transfer',     channel: 'task',       icon: 'sync-alt',             enabled: true, cooldownHours: 12 },
  { kind: 'confirm_recurring',      channel: 'task',       icon: 'sync-alt',             enabled: true, cooldownHours: 12 },
  { kind: 'vacation_budget_ended',  channel: 'task',       icon: 'category-travel',      enabled: true, cooldownHours: 12 },
  { kind: 'confirm_salary',         channel: 'task',       icon: 'piggy-bank',           enabled: true, cooldownHours: DAY },
  { kind: 'broker_transfer',        channel: 'task',       icon: 'wallet',               enabled: true, cooldownHours: 12 },
  { kind: 'broker_idle_cash',       channel: 'task',       icon: 'wallet',               enabled: true, cooldownHours: 12 },
  { kind: 'structural_surplus',     channel: 'task',       icon: 'piggy-bank',           enabled: true, cooldownHours: DAY },
  { kind: 'stale_asset_revaluation',channel: 'task',       icon: 'budget',               enabled: true, cooldownHours: MONTH },
  { kind: 'target_profit_reached',  channel: 'task',       icon: 'trending-up',          enabled: true, cooldownHours: DAY },

  { kind: 'recurring_expense',      channel: 'suggestion', icon: 'sync-alt',             enabled: true, cooldownHours: DAY },
];

export const ICON_BY_KIND: Readonly<Record<string, string>> = Object.fromEntries(
  INSIGHT_REGISTRY.map(definition => [definition.kind, definition.icon])
);

export const DEFAULT_CARD_SETTINGS: Readonly<Record<InsightCardKind, CardSettings>> =
  Object.fromEntries(
    INSIGHT_REGISTRY.map(definition => [
      definition.kind,
      { enabled: definition.enabled, cooldownHours: definition.cooldownHours }
    ])
  ) as Readonly<Record<InsightCardKind, CardSettings>>;

export function definitionsFor(channel: InsightChannel): readonly InsightDefinition[] {
  return INSIGHT_REGISTRY.filter(definition => definition.channel === channel);
}
