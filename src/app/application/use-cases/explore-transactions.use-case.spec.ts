import { exploreTransactions, ExploreTransactionsQuery } from './explore-transactions.use-case';
import { TRANSACTION_LIST_SCHEMA } from '@domain/models/transaction-list-schema';
import { Transaction } from '@domain/models/transaction';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'id',
  date: '2026-01-01',
  description: 'desc',
  amount: 0,
  category: 'cat',
  ...overrides
});

const baseQuery = (overrides: Partial<ExploreTransactionsQuery>): ExploreTransactionsQuery => ({
  transactions: [],
  schema: TRANSACTION_LIST_SCHEMA,
  searchQuery: '',
  tab: 'all',
  sortField: null,
  sortDirection: 'desc',
  pinnedIds: new Set(),
  ...overrides
});

describe('exploreTransactions', () => {
  it('filters by search query before applying the tab filter', () => {
    const result = exploreTransactions(baseQuery({
      transactions: [
        tx({ id: 'a', description: 'Continente' }),
        tx({ id: 'b', description: 'Uber' })
      ],
      searchQuery: 'conti'
    }));

    expect(result.map(t => t.id)).toEqual(['a']);
  });

  it('applies the tab filter (top20 sorted by absolute amount)', () => {
    const result = exploreTransactions(baseQuery({
      transactions: [tx({ id: 'a', amount: -5 }), tx({ id: 'b', amount: 20 })],
      tab: 'top20'
    }));

    expect(result.map(t => t.id)).toEqual(['b', 'a']);
  });

  it('overrides the tab default order with an explicit sort field', () => {
    const result = exploreTransactions(baseQuery({
      transactions: [tx({ id: 'a', amount: 5 }), tx({ id: 'b', amount: 20 })],
      tab: 'all',
      sortField: 'amount',
      sortDirection: 'asc'
    }));

    expect(result.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('always applies pin priority last, after search/filter/sort', () => {
    const result = exploreTransactions(baseQuery({
      transactions: [tx({ id: 'a', amount: 1 }), tx({ id: 'b', amount: 2 }), tx({ id: 'c', amount: 3 })],
      tab: 'all',
      sortField: 'amount',
      sortDirection: 'asc',
      pinnedIds: new Set(['c'])
    }));

    expect(result[0].id).toBe('c');
  });

  it('returns everything when search query is blank', () => {
    const result = exploreTransactions(baseQuery({
      transactions: [tx({ id: 'a' }), tx({ id: 'b' })],
      searchQuery: '   '
    }));

    expect(result).toHaveLength(2);
  });
});
