import { HistoryLog } from '@domain/models/history-log';
import { Transaction } from '@domain/models/transaction';
import { FinancialAccount, CustomAccount } from '@domain/models/account';
import { Budget } from '@domain/models/budget';

export const MOCK_HISTORY_LOGS: HistoryLog[] = [
  {
    id: '123',
    action: 'INSERT',
    entity: 'transaction',
    entityId: 't-1',
    timestamp: '2026-07-29T22:47:48Z'
  }
];

export const MOCK_TABLE_STATS = [{ name: 'Transactions', count: 42, schemaVersion: 1, dbName: 'transactions-db' }];

export const createMockTransaction = (overrides?: Partial<Transaction>): Transaction => ({
  id: `tx-${Math.random().toString(36).substr(2, 9)}`,
  date: '2026-01-01',
  description: 'Mock Transaction',
  amount: 0,
  category: 'Others',
  ...overrides
});

export const createMockFinancialAccount = (overrides?: Partial<FinancialAccount>): FinancialAccount => ({
  id: `acc-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Mock Bank',
  updatedAt: 0,
  kind: 'financial',
  type: 'bank_account',
  scope: 'individual',
  includeInConsolidatedBalance: true,
  unit: 'EUR',
  ...overrides
});

export const createMockCustomAccount = (overrides?: Partial<CustomAccount>): CustomAccount => ({
  id: `acc-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Mock Custom',
  updatedAt: 0,
  kind: 'custom',
  purpose: 'test',
  ...overrides
});

export const createMockBudget = (overrides?: Partial<Budget>): Budget => ({
  id: `bud-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Mock Budget',
  type: 'project',
  amount: 100,
  ...overrides
});
