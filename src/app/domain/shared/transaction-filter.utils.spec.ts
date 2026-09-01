import {
  ALL_FILTER_VALUE,
  TransactionFilterCriteria,
  filterTransactions,
  matchesTransactionQuery
} from './transaction-filter.utils';
import { Transaction } from '@domain/models/transaction';
import { MOCK_TRANSACTIONS, MOCK_BUDGET_PROJECT_VACATION } from '@/mocks/index';

const NO_IDS: ReadonlySet<string> = new Set();

const baseCriteria: TransactionFilterCriteria = {
  accountId: ALL_FILTER_VALUE,
  categoryId: ALL_FILTER_VALUE,
  projectEndDate: '2026-08-28',
  isRecurring: () => false,
  special: null,
  outlierIds: NO_IDS,
  recurringIds: NO_IDS,
  query: ''
};

describe('filterTransactions', () => {
  it('keeps everything when no criterion narrows the list', () => {
    expect(filterTransactions(MOCK_TRANSACTIONS, baseCriteria).length).toBe(MOCK_TRANSACTIONS.length);
  });

  it('narrows to a single account', () => {
    const accountId = MOCK_TRANSACTIONS[0].accountId!;
    const result = filterTransactions(MOCK_TRANSACTIONS, { ...baseCriteria, accountId });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every(t => t.accountId === accountId)).toBe(true);
  });

  it('narrows to a single category', () => {
    const result = filterTransactions(MOCK_TRANSACTIONS, { ...baseCriteria, categoryId: 'Groceries' });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every(t => t.category === 'Groceries')).toBe(true);
  });

  it('combines account and category instead of replacing one with the other', () => {
    const accountId = MOCK_TRANSACTIONS.find(t => t.category === 'Groceries')!.accountId!;
    const result = filterTransactions(MOCK_TRANSACTIONS, { ...baseCriteria, accountId, categoryId: 'Groceries' });

    expect(result.every(t => t.accountId === accountId && t.category === 'Groceries')).toBe(true);
  });

  it('restricts a project filter to the movements the project owns', () => {
    const result = filterTransactions(MOCK_TRANSACTIONS, { ...baseCriteria, project: MOCK_BUDGET_PROJECT_VACATION });

    expect(result.length).toBeLessThan(MOCK_TRANSACTIONS.length);
  });

  it('keeps only the ids given for the outlier filter', () => {
    const target = MOCK_TRANSACTIONS.find(t => t.amount < 0)!;
    const result = filterTransactions(MOCK_TRANSACTIONS, {
      ...baseCriteria,
      special: 'outlier',
      outlierIds: new Set([target.id])
    });

    expect(result).toEqual([target]);
  });

  it('keeps only the ids given for the recurring filter', () => {
    const target = MOCK_TRANSACTIONS.find(t => t.amount < 0)!;
    const result = filterTransactions(MOCK_TRANSACTIONS, {
      ...baseCriteria,
      special: 'recurring',
      recurringIds: new Set([target.id])
    });

    expect(result).toEqual([target]);
  });

  it('keeps only transactions awaiting review', () => {
    const result = filterTransactions(MOCK_TRANSACTIONS, { ...baseCriteria, special: 'pending_review' });

    expect(result.every(t => t.pendingReview)).toBe(true);
  });
});

describe('matchesTransactionQuery', () => {
  const transaction: Transaction = {
    id: 'tx-1',
    date: '2026-08-01',
    description: 'Continente Colombo',
    amount: -42.5,
    category: 'Groceries',
    tags: ['ferias'],
    accountId: 'acc-1'
  };

  it('matches an empty query', () => {
    expect(matchesTransactionQuery(transaction, '   ')).toBe(true);
  });

  it('matches the description regardless of casing', () => {
    expect(matchesTransactionQuery(transaction, 'CONTINENTE')).toBe(true);
  });

  it('matches the category and the tags, not only the description', () => {
    expect(matchesTransactionQuery(transaction, 'grocer')).toBe(true);
    expect(matchesTransactionQuery(transaction, 'feria')).toBe(true);
  });

  it('rejects a query that appears nowhere', () => {
    expect(matchesTransactionQuery(transaction, 'galp')).toBe(false);
  });
});
