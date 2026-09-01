import { sortRecords } from './record-sort.service';
import { Transaction } from '@domain/models/transaction';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'id',
  date: '2026-01-01',
  description: 'desc',
  amount: 0,
  category: 'cat',
  ...overrides
});

describe('sortRecords', () => {
  it('sorts by date ascending', () => {
    const result = sortRecords(
      [tx({ id: 'b', date: '2026-02-01' }), tx({ id: 'a', date: '2026-01-01' })],
      'date',
      'asc'
    );

    expect(result.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('sorts by amount descending', () => {
    const result = sortRecords(
      [tx({ id: 'a', amount: 1 }), tx({ id: 'b', amount: 5 }), tx({ id: 'c', amount: 3 })],
      'amount',
      'desc'
    );

    expect(result.map(t => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by description alphabetically', () => {
    const result = sortRecords(
      [tx({ id: 'a', description: 'zebra' }), tx({ id: 'b', description: 'apple' })],
      'description',
      'asc'
    );

    expect(result.map(t => t.id)).toEqual(['b', 'a']);
  });

  it('treats a missing balance as 0 when sorting by balance', () => {
    const result = sortRecords(
      [tx({ id: 'a', balance: undefined }), tx({ id: 'b', balance: -10 })],
      'balance',
      'asc'
    );

    expect(result.map(t => t.id)).toEqual(['b', 'a']);
  });

  it('does not mutate the input array', () => {
    const transactions = [tx({ id: 'b', date: '2026-02-01' }), tx({ id: 'a', date: '2026-01-01' })];
    const original = [...transactions];

    sortRecords(transactions, 'date', 'asc');

    expect(transactions).toEqual(original);
  });
});
