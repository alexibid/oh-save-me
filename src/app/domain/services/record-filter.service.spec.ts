import { filterByTab } from './record-filter.service';
import { Transaction } from '@domain/models/transaction';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'id',
  date: '2026-01-01',
  description: 'desc',
  amount: 0,
  category: 'cat',
  ...overrides
});

describe('filterByTab', () => {
  it('orders "all" by date, newest first', () => {
    const result = filterByTab(
      [tx({ id: 'a', date: '2026-01-01' }), tx({ id: 'b', date: '2026-02-01' })],
      'all'
    );

    expect(result.map(t => t.id)).toEqual(['b', 'a']);
  });

  it('orders "top20" by absolute amount, largest first, limited to 20', () => {
    const transactions = Array.from({ length: 25 }, (_, i) => tx({ id: `t${i}`, amount: i % 2 === 0 ? i : -i }));

    const result = filterByTab(transactions, 'top20');

    expect(result).toHaveLength(20);
    expect(result[0].id).toBe('t24');
    expect(Math.abs(result[0].amount)).toBeGreaterThanOrEqual(Math.abs(result[1].amount));
  });

  it('keeps only positive amounts for "credit", preserving input order', () => {
    const result = filterByTab(
      [tx({ id: 'a', amount: 10 }), tx({ id: 'b', amount: -5 }), tx({ id: 'c', amount: 3 })],
      'credit'
    );

    expect(result.map(t => t.id)).toEqual(['a', 'c']);
  });

  it('keeps only negative amounts for "debit", preserving input order', () => {
    const result = filterByTab(
      [tx({ id: 'a', amount: 10 }), tx({ id: 'b', amount: -5 }), tx({ id: 'c', amount: -3 })],
      'debit'
    );

    expect(result.map(t => t.id)).toEqual(['b', 'c']);
  });

  it('does not mutate the input array', () => {
    const transactions = [tx({ id: 'a', date: '2026-01-01' }), tx({ id: 'b', date: '2026-02-01' })];
    const original = [...transactions];

    filterByTab(transactions, 'all');

    expect(transactions).toEqual(original);
  });
});
