import { Transaction } from '@domain/models/transaction';
import { Account, isFinancialAccount } from '@domain/models/account';
import { calculateCashBalance, calculateInvestedValue } from './investment-valuation';
import { isTransferCategory } from './transfer.utils';

export interface MovementsBalancePoint {
  readonly date: string;
  readonly income: number;
  readonly expenses: number;
  readonly balance: number;
}

export interface ChartWindow {
  readonly start: string;
  readonly end: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function groupByAccount(transactions: readonly Transaction[]): readonly (readonly Transaction[])[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = t.accountId ?? '';
    const group = groups.get(key);
    if (group) group.push(t); else groups.set(key, [t]);
  }
  return Array.from(groups.values());
}
function reportedOrCumulativeCheckpoints(accountTransactions: readonly Transaction[]): ReadonlyMap<string, number> {
  const hasReportedBalance = accountTransactions.some(t => t.balance !== undefined && t.balance !== null);
  const checkpoints = new Map<string, number>();
  let cumulative = 0;
  let lastKnownBalance = 0;
  let lastKnownDate = '';

  for (const t of accountTransactions) {
    cumulative += t.amount;

    if (t.balance !== undefined && t.balance !== null) {
      lastKnownBalance = t.date === lastKnownDate ? Math.max(lastKnownBalance, t.balance) : t.balance;
      lastKnownDate = t.date;
    }

    checkpoints.set(t.date, hasReportedBalance ? lastKnownBalance : cumulative);
  }

  return checkpoints;
}
function investmentCheckpoints(accountTransactions: readonly Transaction[], openingBalance: number): ReadonlyMap<string, number> {
  const dates = Array.from(new Set(accountTransactions.map(t => t.date)));
  const checkpoints = new Map<string, number>();

  for (const date of dates) {
    const txsUpToDate = accountTransactions.filter(t => t.date <= date);
    const total = calculateCashBalance(txsUpToDate) + openingBalance + calculateInvestedValue(txsUpToDate);
    checkpoints.set(date, round2(total));
  }

  return checkpoints;
}

function balanceCheckpoints(accountTransactions: readonly Transaction[], account: Account | undefined): ReadonlyMap<string, number> {
  if (account && isFinancialAccount(account) && account.type === 'investment') {
    return investmentCheckpoints(accountTransactions, account.openingBalance ?? 0);
  }
  return reportedOrCumulativeCheckpoints(accountTransactions);
}

function totalBalanceByDate(
  perAccountCheckpoints: readonly ReadonlyMap<string, number>[],
  dates: readonly string[]
): ReadonlyMap<string, number> {
  const runningPerAccount = perAccountCheckpoints.map(() => 0);
  const totals = new Map<string, number>();

  for (const date of dates) {
    perAccountCheckpoints.forEach((checkpoints, i) => {
      const value = checkpoints.get(date);
      if (value !== undefined) runningPerAccount[i] = value;
    });
    totals.set(date, round2(runningPerAccount.reduce((sum, value) => sum + value, 0)));
  }

  return totals;
}

function flowsByDate(sortedTransactions: readonly Transaction[]): ReadonlyMap<string, { income: number; expenses: number }> {
  const flows = new Map<string, { income: number; expenses: number }>();
  for (const t of sortedTransactions) {
    if (isTransferCategory(t.category)) continue;
    const entry = flows.get(t.date) ?? { income: 0, expenses: 0 };
    if (t.amount > 0) entry.income += t.amount; else entry.expenses += t.amount;
    flows.set(t.date, entry);
  }
  return flows;
}
export function buildMovementsBalanceSeries(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  window: ChartWindow
): readonly MovementsBalancePoint[] {
  const relevant = transactions.filter(t => t.date <= window.end);
  if (relevant.length === 0) return [];

  const sorted = [...relevant].sort((a, b) => a.date.localeCompare(b.date));
  const accountsById = new Map(accounts.map(a => [a.id, a]));

  const perAccountCheckpoints = groupByAccount(sorted).map(group =>
    balanceCheckpoints(group, accountsById.get(group[0].accountId ?? ''))
  );
  const timeline = Array.from(new Set([...sorted.map(t => t.date), window.end])).sort();
  const balances = totalBalanceByDate(perAccountCheckpoints, timeline);

  const visibleTransactions = sorted.filter(t => t.date >= window.start);
  const flows = flowsByDate(visibleTransactions);
  const visibleDates = timeline.filter(d => d >= window.start);

  return visibleDates.map(date => {
    const flow = flows.get(date) ?? { income: 0, expenses: 0 };
    return {
      date,
      income: round2(flow.income),
      expenses: round2(flow.expenses),
      balance: balances.get(date) ?? 0
    };
  });
}
