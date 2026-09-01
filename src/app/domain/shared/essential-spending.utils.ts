import { CategoryType } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';
import { isLegacyOrphanedCategory, isTransferCategory } from './transfer.utils';
import { CategoryRoles, DEFAULT_INSIGHT_CONFIG } from '@domain/services/insight-config';

export interface SpendingSplit {
  readonly essential: number;
  readonly lifestyle: number;
}

export function isEssentialCategory(
  categoryId: CategoryType,
  roles: CategoryRoles = DEFAULT_INSIGHT_CONFIG.categories
): boolean {
  return roles.essential.includes(categoryId);
}

export function countsAsIncome(
  transaction: Transaction,
  roles: CategoryRoles = DEFAULT_INSIGHT_CONFIG.categories
): boolean {
  if (transaction.countsAsIncome !== undefined) return transaction.countsAsIncome;
  return transaction.category === roles.salary;
}

export function splitEssentialSpending(
  transactions: readonly Transaction[],
  roles: CategoryRoles = DEFAULT_INSIGHT_CONFIG.categories
): SpendingSplit {
  let essential = 0;
  let lifestyle = 0;

  for (const transaction of transactions) {
    if (transaction.amount >= 0) continue;
    if (isTransferCategory(transaction.category)) continue;
    if (isLegacyOrphanedCategory(transaction.category)) continue;

    const amount = Math.abs(transaction.amount);
    if (isEssentialCategory(transaction.category, roles)) essential += amount;
    else lifestyle += amount;
  }

  return { essential: round(essential), lifestyle: round(lifestyle) };
}

export function budgetedEssentials(
  budgets: readonly Budget[],
  roles: CategoryRoles = DEFAULT_INSIGHT_CONFIG.categories
): number {
  return round(
    budgets
      .filter(budget => budget.type === 'category' && !!budget.categoryId && isEssentialCategory(budget.categoryId, roles))
      .reduce((sum, budget) => sum + budget.amount, 0)
  );
}

export interface MonthlyAverages {
  readonly essentials: number;
  readonly income: number;
  readonly surplus: number;
  readonly monthsCounted: number;
}

export function monthlyAverages(
  transactions: readonly Transaction[],
  monthsToConsider: number,
  incompleteMonth: string,
  roles: CategoryRoles = DEFAULT_INSIGHT_CONFIG.categories
): MonthlyAverages {
  const essentialsByMonth = new Map<string, number>();
  const incomeByMonth = new Map<string, number>();

  for (const transaction of transactions) {
    if (!transaction.date) continue;
    if (isTransferCategory(transaction.category)) continue;
    if (isLegacyOrphanedCategory(transaction.category)) continue;

    const month = transaction.date.slice(0, 7);
    if (month === incompleteMonth) continue;

    if (transaction.amount > 0) {
      if (countsAsIncome(transaction, roles)) {
        incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + transaction.amount);
      }
      continue;
    }
    if (!isEssentialCategory(transaction.category, roles)) continue;
    essentialsByMonth.set(month, (essentialsByMonth.get(month) ?? 0) + Math.abs(transaction.amount));
  }

  const months = [...new Set([...essentialsByMonth.keys(), ...incomeByMonth.keys()])]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, monthsToConsider);

  if (months.length === 0) {
    return { essentials: 0, income: 0, surplus: 0, monthsCounted: 0 };
  }

  const essentials = round(average(months.map(month => essentialsByMonth.get(month) ?? 0)));
  const income = round(average(months.map(month => incomeByMonth.get(month) ?? 0)));

  return { essentials, income, surplus: round(income - essentials), monthsCounted: months.length };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
