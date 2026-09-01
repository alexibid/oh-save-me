import { Transaction } from '@domain/models/transaction';
import { formatDateLocal } from '@ibid/utils';
import { latestKnownDay } from '@ibid/utils';

const DAYS_PER_MS = 1000 * 60 * 60 * 24;

export function filterTransactionsByPeriod(
  transactions: readonly Transaction[],
  startDate?: string,
  endDate?: string
): Transaction[] {
  const referenceDate = effectiveToday(transactions);
  const [year, month] = referenceDate.split('-').map(Number);
  const effectiveStart = startDate || `${year}-${String(month).padStart(2, '0')}-01`;
  const effectiveEnd = endDate || `${year}-${String(month).padStart(2, '0')}-31`;

  return transactions.filter(t => {
    if (!t.date) return false;
    if (t.date < effectiveStart) return false;
    if (t.date > effectiveEnd) return false;
    return true;
  });
}

export function effectiveToday(transactions: readonly Transaction[]): string {
  const newest = transactions
    .filter(t => t.date)
    .reduce((latest, t) => (t.date > latest ? t.date : latest), '');
  return latestKnownDay(formatDateLocal(new Date()), newest);
}

export function recentWindow(
  transactions: readonly Transaction[],
  endDate: string,
  windowDays: number
): readonly Transaction[] {
  const today = new Date();
  const end = new Date(endDate);
  const window = today > end ? end : today;

  const from = new Date(window);
  from.setDate(from.getDate() - (windowDays - 1));

  const firstDay = formatDateLocal(from);
  const lastDay = formatDateLocal(window);

  return transactions.filter(t => t.date && t.date >= firstDay && t.date <= lastDay);
}

export function weeksIn(days: number, daysPerWeek: number): number {
  return Math.max(1, Math.round(days / daysPerWeek));
}

export function periodProgressInDays(startDate: string, endDate: string): { elapsed: number; total: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  const cappedToday = today > end ? end : today;

  return {
    elapsed: Math.max(1, daysBetween(start, cappedToday)),
    total: Math.max(1, daysBetween(start, end)),
  };
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAYS_PER_MS);
}
