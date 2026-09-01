import { describe, it, expect } from 'vitest';
import { assertMockDataIntegrity, MOCK_METRICS } from './metrics.mock';
import { MOCK_TRANSACTIONS } from './transactions.mock';
import { MOCK_ACCOUNTS } from './accounts.mock';
import { MOCK_BUDGETS } from './budgets.mock';

describe('Mock Data Integrity & Mathematical Invariants', () => {
  it('should pass data integrity assertions without errors', () => {
    const { isValid, errors } = assertMockDataIntegrity(MOCK_TRANSACTIONS, MOCK_ACCOUNTS, MOCK_BUDGETS);
    expect(errors).toEqual([]);
    expect(isValid).toBe(true);
  });

  it('should have exact transaction count matching MOCK_METRICS', () => {
    expect(MOCK_TRANSACTIONS.length).toBe(MOCK_METRICS.overall.totalTransactionsCount);
  });

  it('should balance transfers to exact net zero sum', () => {
    const transferTxs = MOCK_TRANSACTIONS.filter(t => t.category === 'Transfers');
    const netTransfers = transferTxs.reduce((sum, t) => sum + t.amount, 0);
    expect(netTransfers).toBe(MOCK_METRICS.overall.totalTransfers);
  });
});
