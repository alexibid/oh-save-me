import { applyPinPriority } from './record-pin.service';
import { Transaction } from '@domain/models/transaction';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'id',
  date: '2026-01-01',
  description: 'desc',
  amount: 0,
  category: 'cat',
  ...overrides
});

describe('applyPinPriority', () => {
  it('moves pinned records to the top', () => {
    const result = applyPinPriority(
      [tx({ id: 'a' }), tx({ id: 'b' }), tx({ id: 'c' })],
      new Set(['c'])
    );

    expect(result.map(t => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('preserves relative order among pinned and among unpinned records', () => {
    const result = applyPinPriority(
      [tx({ id: 'a' }), tx({ id: 'b' }), tx({ id: 'c' }), tx({ id: 'd' })],
      new Set(['b', 'd'])
    );

    expect(result.map(t => t.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('returns records unchanged when nothing is pinned', () => {
    const result = applyPinPriority([tx({ id: 'a' }), tx({ id: 'b' })], new Set());

    expect(result.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input array', () => {
    const transactions = [tx({ id: 'a' }), tx({ id: 'b' })];
    const original = [...transactions];

    applyPinPriority(transactions, new Set(['b']));

    expect(transactions).toEqual(original);
  });
});
