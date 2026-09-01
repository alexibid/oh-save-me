import { Transaction } from '@domain/models/transaction';
import { isTransferCategory } from './transfer.utils';

const EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set([
  'AssetSale',
  'Dividends',
  'Interest',
  'Investments'
]);

const AMOUNT_TOLERANCE_RATIO = 0.15;
const MIN_MONTHS = 3;
const MIN_AVERAGE_GAP_DAYS = 24;
const MAX_AVERAGE_GAP_DAYS = 36;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RecurringIncomeGroup {
  readonly transactions: readonly Transaction[];
  readonly averageAmount: number;
  readonly months: number;
  readonly latest: Transaction;
}

export function detectRecurringIncome(
  transactions: readonly Transaction[],
  lookbackMonths: number
): RecurringIncomeGroup | null {
  const candidates = eligibleInflows(transactions, lookbackMonths);
  const claimed = new Set<string>();

  let best: RecurringIncomeGroup | null = null;

  for (const candidate of candidates) {
    if (claimed.has(candidate.id)) continue;

    const group = oncePerMonth(
      candidates.filter(
        other => !claimed.has(other.id) && withinTolerance(other.amount, candidate.amount)
      )
    );
    group.forEach(transaction => claimed.add(transaction.id));

    if (group.length < MIN_MONTHS || !arrivesMonthly(group)) continue;
    if (best && averageOf(group) <= best.averageAmount) continue;

    best = {
      transactions: group,
      averageAmount: averageOf(group),
      months: group.length,
      latest: group[group.length - 1],
    };
  }

  return best;
}

function eligibleInflows(
  transactions: readonly Transaction[],
  lookbackMonths: number
): readonly Transaction[] {
  const from = new Date();
  from.setMonth(from.getMonth() - lookbackMonths);
  const firstDay = from.toISOString().slice(0, 10);

  return transactions
    .filter(transaction => transaction.amount > 0 && !!transaction.date)
    .filter(transaction => transaction.date >= firstDay)
    .filter(transaction => transaction.countsAsIncome === undefined)
    .filter(transaction => !transaction.symbol && !transaction.investmentType)
    .filter(transaction => !isTransferCategory(transaction.category))
    .filter(transaction => !EXCLUDED_CATEGORIES.has(transaction.category))
    .sort((a, b) => b.amount - a.amount);
}

function oncePerMonth(transactions: readonly Transaction[]): readonly Transaction[] {
  const byMonth = new Map<string, Transaction>();

  for (const transaction of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    const month = transaction.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, transaction);
  }

  return [...byMonth.values()];
}

function arrivesMonthly(group: readonly Transaction[]): boolean {
  const dates = group.map(transaction => new Date(transaction.date).getTime());
  const gaps = dates.slice(1).map((date, index) => (date - dates[index]) / MS_PER_DAY);
  const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  return average >= MIN_AVERAGE_GAP_DAYS && average <= MAX_AVERAGE_GAP_DAYS;
}

function withinTolerance(amount: number, reference: number): boolean {
  return Math.abs(amount - reference) <= reference * AMOUNT_TOLERANCE_RATIO;
}

function averageOf(group: readonly Transaction[]): number {
  const total = group.reduce((sum, transaction) => sum + transaction.amount, 0);
  return Math.round((total / group.length) * 100) / 100;
}
