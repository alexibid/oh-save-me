import { FinancialAccount } from '@domain/models/account';
import { Budget } from '@domain/models/budget';
import { CategoryInfo } from '@domain/models/category';
import { Transaction } from '@domain/models/transaction';

export const FREE_BALANCE_CATEGORY: CategoryInfo = {
  id: 'cat-transport',
  name: 'Transporte',
  icon: 'category-transport',
  color: '#6366f1'
};

export const FREE_BALANCE_ACCOUNT: FinancialAccount = {
  id: 'acc-1',
  kind: 'financial',
  name: 'Account',
  type: 'bank_account',
  scope: 'individual',
  includeInConsolidatedBalance: true,
  unit: 'EUR',
  updatedAt: 0,
  openingBalance: 1000
};

export const FREE_BALANCE_CATEGORY_BUDGET: Budget = {
  id: 'b-cat-transport',
  name: 'Transport',
  type: 'category',
  categoryId: FREE_BALANCE_CATEGORY.id,
  amount: 200
};

export function createCategorySpendTransaction(amount: number): Transaction {
  return {
    id: 't1',
    date: '2026-07-05',
    description: 'Transport',
    amount: -amount,
    accountId: FREE_BALANCE_ACCOUNT.id,
    category: FREE_BALANCE_CATEGORY.id
  };
}
