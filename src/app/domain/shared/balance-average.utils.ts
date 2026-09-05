import { DEFAULT_INSIGHT_CONFIG } from '@domain/services/insight-config';
import { Transaction } from '@domain/models/transaction';
import { Account } from '@domain/models/account';
import { isTransferCategory, isLegacyOrphanedCategory } from '@domain/shared/transfer.utils';

export type BalanceWindow = 'quarter' | 'semester' | 'year' | 'all';

export interface MonthlyNetFlowPoint {
  readonly month: string;
  readonly realBalance: number;
  readonly averageNetFlow: number;
}

const WINDOW_MONTHS: Record<BalanceWindow, number | null> = {
  quarter: 3,
  semester: 6,
  year: 12,
  all: null
};

const WINDOW_EDGE_DAY = DEFAULT_INSIGHT_CONFIG.windows.balanceTrendCentreDay;
const WINDOW_MONTHS_SPAN = DEFAULT_INSIGHT_CONFIG.windows.balanceTrendSmoothingMonths;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function windowMonthCount(window: BalanceWindow): number | null {
  return WINDOW_MONTHS[window];
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / MS_PER_DAY);
}

function edgeDayAround(month: string, monthOffset: number): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;
  return toDay(new Date(Date.UTC(year, index + monthOffset, WINDOW_EDGE_DAY)));
}

function addMonths(month: string, count: number): string {
  const index = Number(month.slice(5, 7)) - 1 + count;
  const year = Number(month.slice(0, 4)) + Math.floor(index / 12);
  return `${year}-${String(((index % 12) + 12) % 12 + 1).padStart(2, '0')}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function countsAsFlow(transaction: Transaction): boolean {
  return !isTransferCategory(transaction.category) && !isLegacyOrphanedCategory(transaction.category);
}

export function buildMonthlyNetFlow(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  window: BalanceWindow
): readonly MonthlyNetFlowPoint[] {
  const consolidated = new Set(
    accounts.filter(a => a.kind !== 'financial' || a.includeInConsolidatedBalance).map(a => a.id)
  );
  const owned = transactions.filter(t => t.date && (!t.accountId || consolidated.has(t.accountId)));

  const withBalance = owned
    .filter((t): t is Transaction & { balance: number } => t.balance !== undefined && t.balance !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (withBalance.length === 0) return [];

  const balanceByAccount = new Map<string, number>();
  const closingBalance = new Map<string, number>();
  for (const transaction of withBalance) {
    balanceByAccount.set(transaction.accountId ?? '', transaction.balance);
    const total = [...balanceByAccount.values()].reduce((sum, value) => sum + value, 0);
    closingBalance.set(transaction.date.slice(0, 7), round(total));
  }

  const flows = owned.filter(countsAsFlow);
  const firstDay = withBalance[0].date;
  const lastDay = withBalance[withBalance.length - 1].date;

  const firstMonth = firstDay.slice(0, 7);
  const lastMonth = lastDay.slice(0, 7);

  const points: MonthlyNetFlowPoint[] = [];
  let carriedBalance = closingBalance.get(firstMonth) ?? 0;

  for (let month = firstMonth; month <= lastMonth; month = addMonths(month, 1)) {
    carriedBalance = closingBalance.get(month) ?? carriedBalance;

    const idealStart = edgeDayAround(month, -1);
    const idealEnd = edgeDayAround(month, 1);
    const windowStart = maxDay(idealStart, firstDay);
    const windowEnd = minDay(idealEnd, lastDay);

    const idealDays = daysBetween(idealStart, idealEnd);
    const actualDays = Math.max(1, daysBetween(windowStart, windowEnd));
    const monthsCovered = Math.max(1 / WINDOW_MONTHS_SPAN, WINDOW_MONTHS_SPAN * (actualDays / idealDays));

    const net = flows
      .filter(t => t.date >= windowStart && t.date <= windowEnd)
      .reduce((sum, t) => sum + t.amount, 0);

    points.push({
      month,
      realBalance: carriedBalance,
      averageNetFlow: round(net / monthsCovered)
    });

    if (month === lastMonth) break;
  }

  const limit = WINDOW_MONTHS[window];
  return limit === null ? points : points.slice(-limit);
}

function maxDay(a: string, b: string): string {
  return a > b ? a : b;
}

function minDay(a: string, b: string): string {
  return a < b ? a : b;
}
