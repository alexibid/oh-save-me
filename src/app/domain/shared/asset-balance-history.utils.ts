import { Transaction } from '@domain/models/transaction';

export interface MonthlyBalancePoint {
  readonly month: string;
  readonly balance: number;
}

export function buildAssetBalanceHistory(transactions: readonly Transaction[]): readonly MonthlyBalancePoint[] {
  const deltas = new Map<string, number>();

  for (const transaction of transactions) {
    if (!transaction.symbol || !transaction.date) continue;
    if (transaction.investmentType !== 'buy' && transaction.investmentType !== 'sell') continue;

    const month = transaction.date.slice(0, 7);
    const amount = Math.abs(transaction.amount);
    const signed = transaction.investmentType === 'buy' ? amount : -amount;
    deltas.set(month, (deltas.get(month) ?? 0) + signed);
  }

  const months = [...deltas.keys()].sort();
  if (months.length === 0) return [];

  const points: MonthlyBalancePoint[] = [];
  let balance = 0;

  for (const month of monthRange(months[0], months[months.length - 1])) {
    balance = Math.max(0, balance + (deltas.get(month) ?? 0));
    points.push({ month, balance: round(balance) });
  }

  return points;
}

function monthRange(first: string, last: string): readonly string[] {
  const months: string[] = [];
  let current = first;

  while (current <= last) {
    months.push(current);
    current = addMonth(current);
  }

  return months;
}

function addMonth(month: string): string {
  const index = Number(month.slice(5, 7));
  const year = Number(month.slice(0, 4));
  return index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
