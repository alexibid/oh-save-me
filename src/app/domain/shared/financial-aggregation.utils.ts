import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';
import { PatrimonySnapshot } from '@domain/services/suggestion-engine.types';
import { isTransferCategory, isLegacyOrphanedCategory } from './transfer.utils';

export function sumExpenses(transactions: readonly Transaction[]): number {
  return transactions
    .filter(t => t.amount < 0 && !isTransferCategory(t.category) && !isLegacyOrphanedCategory(t.category))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function sumIncome(transactions: readonly Transaction[]): number {
  return transactions
    .filter(t => t.amount > 0 && !isTransferCategory(t.category) && !isLegacyOrphanedCategory(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
}

export function sumCategoryBudgets(budgets: readonly Budget[]): number {
  return budgets
    .filter(budget => budget.type === 'category')
    .reduce((sum, budget) => sum + budget.amount, 0);
}

export function totalPatrimonyOf(patrimony: PatrimonySnapshot): number {
  return Math.round((patrimony.accessible + patrimony.reserved + patrimony.invested + patrimony.property) * 100) / 100;
}
