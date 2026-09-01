import { outlierExpenseIds } from './outlier-transaction.utils';
import { Transaction } from '@domain/models/transaction';
import { MOCK_TRANSACTIONS } from '@/mocks/index';

const expense = (id: string, amount: number, category = 'Groceries'): Transaction => ({
  id,
  date: '2026-08-01',
  description: id,
  amount,
  category,
  accountId: 'acc-1'
});

const repeated = (prefix: string, amounts: readonly number[], category: string): Transaction[] =>
  amounts.map((amount, index) => expense(`${prefix}-${index}`, amount, category));

describe('outlierExpenseIds', () => {
  it('flags the expense that stands far outside the others', () => {
    const transactions = [
      expense('tx-1', -20),
      expense('tx-2', -22),
      expense('tx-3', -19),
      expense('tx-4', -21),
      expense('tx-5', -2000)
    ];

    expect(outlierExpenseIds(transactions)).toEqual(new Set(['tx-5']));
  });

  it('ignores income and never flags a sample too small to judge', () => {
    const transactions = [expense('tx-1', -20), expense('tx-2', -5000), { ...expense('tx-3', 9000) }];

    expect(outlierExpenseIds(transactions).size).toBe(0);
  });

  it('leaves a recurring bill alone even when it dwarfs the median of every other category', () => {
    const transactions = [
      ...repeated('grocery', [-12, -18, -25, -31, -14, -22, -19, -27], 'Groceries'),
      ...repeated('insurance', [-206, -206, -207, -206, -205, -206], 'Taxes')
    ];

    expect(outlierExpenseIds(transactions).size).toBe(0);
  });

  it('judges each category against its own scale rather than a single global threshold', () => {
    const transactions = [
      ...repeated('grocery', [-12, -18, -25, -31, -14, -22, -19, -27], 'Groceries'),
      ...repeated('rent', [-800, -800, -800, -800, -800, -800], 'Housing'),
      expense('grocery-spike', -900, 'Groceries')
    ];

    expect(outlierExpenseIds(transactions)).toEqual(new Set(['grocery-spike']));
  });

  it('reports only unusually large expenses, never unusually small ones', () => {
    const transactions = repeated('coffee', [-30, -32, -29, -31, -30, -33, -0.05], 'Restaurants');

    expect(outlierExpenseIds(transactions).size).toBe(0);
  });

  it('ignores transfers, which are movements between the owner accounts rather than spending', () => {
    const transactions = [
      ...repeated('transfer', [-50, -60, -55, -52, -58, -5000], 'Transfers')
    ];

    expect(outlierExpenseIds(transactions).size).toBe(0);
  });

  it('returns only expense ids for the seeded statement data', () => {
    const ids = outlierExpenseIds(MOCK_TRANSACTIONS);
    const expenseIds = new Set(MOCK_TRANSACTIONS.filter(t => t.amount < 0).map(t => t.id));

    for (const id of ids) {
      expect(expenseIds.has(id)).toBe(true);
    }
  });
});
