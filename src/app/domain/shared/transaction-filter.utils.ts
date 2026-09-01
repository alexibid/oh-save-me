import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';
import { matchesProjectBudget } from './project-transaction.utils';

export function isUncategorized(t: Transaction): boolean {
  if (!t.category) return true;
  const normalized = t.category.toLowerCase().trim();
  return normalized === '' || normalized === 'uncategorized' || normalized === 'others' || normalized === 'outros';
}

import { countsAsIncome } from './essential-spending.utils';

export type SpecialTransactionFilter = 'pending_review' | 'uncategorized' | 'outlier' | 'recurring' | 'income';

export const ALL_FILTER_VALUE = 'all';

export const NO_TRANSACTION_IDS: ReadonlySet<string> = new Set();

export interface TransactionFilterCriteria {
  readonly accountId: string;
  readonly categoryId: string;
  readonly project?: Budget;
  readonly projectEndDate: string;
  readonly isRecurring: (t: Transaction) => boolean;
  readonly special: SpecialTransactionFilter | null;
  readonly outlierIds: ReadonlySet<string>;
  readonly recurringIds: ReadonlySet<string>;
  readonly query: string;
}

export function filterTransactions(
  transactions: readonly Transaction[],
  criteria: TransactionFilterCriteria
): readonly Transaction[] {
  return transactions.filter(transaction =>
    matchesAccount(transaction, criteria.accountId) &&
    matchesCategory(transaction, criteria.categoryId) &&
    matchesProject(transaction, criteria) &&
    matchesSpecialFilter(transaction, criteria) &&
    matchesTransactionQuery(transaction, criteria.query)
  );
}

export function matchesTransactionQuery(transaction: Transaction, query: string): boolean {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return true;

  return transaction.description.toLowerCase().includes(normalized)
    || transaction.category.toLowerCase().includes(normalized)
    || (transaction.tags?.some(tag => tag.toLowerCase().includes(normalized)) ?? false);
}

function matchesAccount(transaction: Transaction, accountId: string): boolean {
  return accountId === ALL_FILTER_VALUE || transaction.accountId === accountId;
}

function matchesCategory(transaction: Transaction, categoryId: string): boolean {
  return categoryId === ALL_FILTER_VALUE || transaction.category === categoryId;
}

function matchesProject(transaction: Transaction, criteria: TransactionFilterCriteria): boolean {
  if (!criteria.project) return true;
  return matchesProjectBudget(transaction, criteria.project, criteria.projectEndDate, criteria.isRecurring);
}

function matchesSpecialFilter(transaction: Transaction, criteria: TransactionFilterCriteria): boolean {
  switch (criteria.special) {
    case 'pending_review': return !!transaction.pendingReview;
    case 'uncategorized': return isUncategorized(transaction);
    case 'outlier': return criteria.outlierIds.has(transaction.id);
    case 'recurring': return criteria.recurringIds.has(transaction.id);
    case 'income': return transaction.amount > 0 && countsAsIncome(transaction);
    default: return true;
  }
}
