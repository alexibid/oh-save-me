import { buildMovementsBalanceSeries } from './movements-chart.utils';
import { Transaction } from '@domain/models/transaction';
import { FinancialAccount } from '@domain/models/account';

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'date' | 'amount'>): Transaction {
  return { description: '', category: '', ...overrides };
}

function account(overrides: Partial<FinancialAccount> & Pick<FinancialAccount, 'id' | 'type'>): FinancialAccount {
  return {
    kind: 'financial',
    name: '',
    scope: 'individual',
    includeInConsolidatedBalance: true,
    unit: 'EUR',
    updatedAt: 0,
    ...overrides
  };
}

describe('buildMovementsBalanceSeries', () => {
  it('returns an empty series for no transactions', () => {
    expect(buildMovementsBalanceSeries([], [], { start: '2026-06-01', end: '2026-06-01' })).toEqual([]);
  });

  it('returns one point per exact transaction date, matching what the table would list', () => {
    const result = buildMovementsBalanceSeries([
      tx({ id: '1', date: '2026-06-01', amount: 100 }),
      tx({ id: '2', date: '2026-06-05', amount: -30 }),
      tx({ id: '3', date: '2026-08-20', amount: -20 })
    ], [], { start: '2026-06-01', end: '2026-08-20' });

    expect(result.map(p => p.date)).toEqual(['2026-06-01', '2026-06-05', '2026-08-20']);
  });

  it('collapses same-day transactions into a single point summing income and expenses separately', () => {
    const result = buildMovementsBalanceSeries([
      tx({ id: '1', date: '2026-06-01', amount: 100 }),
      tx({ id: '2', date: '2026-06-01', amount: -30 }),
      tx({ id: '3', date: '2026-06-01', amount: -10 })
    ], [], { start: '2026-06-01', end: '2026-06-01' });

    expect(result).toEqual([{ date: '2026-06-01', income: 100, expenses: -40, balance: 60 }]);
  });

  it('excludes Transfers-category transactions from income/expenses (internal movement, not real flow)', () => {
    const result = buildMovementsBalanceSeries([
      tx({ id: '1', date: '2026-06-01', amount: 100, category: 'Income' }),
      tx({ id: '2', date: '2026-06-01', amount: -30, category: 'Groceries' }),
      tx({ id: '3', date: '2026-06-01', amount: -500, category: 'Transfers' })
    ], [], { start: '2026-06-01', end: '2026-06-01' });

    expect(result[0].income).toBe(100);
    expect(result[0].expenses).toBe(-30);
  });

  it('prefers the real running balance reported on transactions over the cumulative sum', () => {
    const result = buildMovementsBalanceSeries([
      tx({ id: '1', date: '2026-06-01', amount: 100, balance: 1100 }),
      tx({ id: '2', date: '2026-06-02', amount: -30, balance: 1070 })
    ], [], { start: '2026-06-01', end: '2026-06-02' });

    expect(result.map(p => p.balance)).toEqual([1100, 1070]);
  });

  it('carries the last known real balance forward into dates with no balance-reporting transactions', () => {
    const result = buildMovementsBalanceSeries([
      tx({ id: '1', date: '2026-06-01', amount: 100, balance: 1100 }),
      tx({ id: '2', date: '2026-06-02', amount: -30 })
    ], [], { start: '2026-06-01', end: '2026-06-02' });

    expect(result.map(p => p.balance)).toEqual([1100, 1100]);
  });

  it('sorts points chronologically regardless of input order', () => {
    const result = buildMovementsBalanceSeries([
      tx({ id: '2', date: '2026-06-05', amount: -30 }),
      tx({ id: '1', date: '2026-06-01', amount: 100 })
    ], [], { start: '2026-06-01', end: '2026-06-05' });

    expect(result.map(p => p.date)).toEqual(['2026-06-01', '2026-06-05']);
  });

  it('picks the highest reported balance among same-day transactions, matching how BudgetSelectors resolves same-day ties', () => {

    const result = buildMovementsBalanceSeries([
      tx({ id: '1', date: '2026-07-31', amount: 100, balance: 500 }),
      tx({ id: '2', date: '2026-07-31', amount: -20, balance: 480 })
    ], [], { start: '2026-07-31', end: '2026-07-31' });

    expect(result[0].balance).toBe(500);
  });

  describe('when transactions span multiple accounts (the unfiltered "all accounts" view)', () => {
    it('sums each account\'s own reported balance instead of only keeping the last one written', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-06-01', amount: 100, balance: 100, accountId: 'acc-a' }),
        tx({ id: '2', date: '2026-06-01', amount: 50, balance: 50, accountId: 'acc-b' })
      ], [], { start: '2026-06-01', end: '2026-06-01' });

      expect(result).toEqual([{ date: '2026-06-01', income: 150, expenses: 0, balance: 150 }]);
    });

    it('carries each account\'s own last known balance forward independently on days it has no activity', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-06-01', amount: 100, balance: 100, accountId: 'acc-a' }),
        tx({ id: '2', date: '2026-06-01', amount: 50, balance: 50, accountId: 'acc-b' }),
        tx({ id: '3', date: '2026-06-02', amount: 20, balance: 120, accountId: 'acc-a' })
      ], [], { start: '2026-06-01', end: '2026-06-02' });

      expect(result.map(p => p.balance)).toEqual([150, 170]);
    });

    it('sums independent cumulative fallbacks per account when neither reports a running balance', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-06-01', amount: 100, accountId: 'acc-a' }),
        tx({ id: '2', date: '2026-06-02', amount: -30, accountId: 'acc-b' })
      ], [], { start: '2026-06-01', end: '2026-06-02' });

      expect(result.map(p => p.balance)).toEqual([100, 70]);
    });

    it('keeps a dormant account\'s last known balance in the total even when none of its activity falls inside the visible window', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-05-01', amount: 5000, balance: 5000, accountId: 'acc-a' }),
        tx({ id: '2', date: '2026-07-20', amount: 3745.87, balance: 3745.87, accountId: 'acc-b' })
      ], [], { start: '2026-07-01', end: '2026-07-31' });

      expect(result.map(p => p.date)).toEqual(['2026-07-20', '2026-07-31']);
      expect(result[result.length - 1]).toEqual({ date: '2026-07-31', income: 0, expenses: 0, balance: 8745.87 });
    });
  });

  describe('when an account is an investment account (e.g. Trade Republic)', () => {
    const tradeRepublic = account({ id: 'acc-tr', type: 'investment' });

    it('ignores the reported balance column and values the account as cash + cost basis of open positions', () => {

      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-06-01', amount: 1000, balance: 1000, accountId: 'acc-tr', investmentType: 'deposit' }),
        tx({
          id: '2', date: '2026-06-02', amount: -1000, balance: 0, accountId: 'acc-tr',
          investmentType: 'buy', symbol: 'AAPL', shares: 10
        })
      ], [tradeRepublic], { start: '2026-06-01', end: '2026-06-02' });

      expect(result.map(p => p.balance)).toEqual([1000, 1000]);
    });

    it('adds the account\'s opening balance to the cash + invested total', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-06-01', amount: 200, accountId: 'acc-tr', investmentType: 'deposit' })
      ], [account({ id: 'acc-tr', type: 'investment', openingBalance: 500 })], { start: '2026-06-01', end: '2026-06-01' });

      expect(result.map(p => p.balance)).toEqual([700]);
    });

    it('sums correctly alongside a regular bank account in the unfiltered view', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-06-01', amount: 1000, balance: 1000, accountId: 'acc-tr', investmentType: 'deposit' }),
        tx({
          id: '2', date: '2026-06-01', amount: -1000, balance: 0, accountId: 'acc-tr',
          investmentType: 'buy', symbol: 'AAPL', shares: 10
        }),
        tx({ id: '3', date: '2026-06-01', amount: 300, balance: 300, accountId: 'acc-cgd' })
      ], [tradeRepublic], { start: '2026-06-01', end: '2026-06-01' });

      expect(result.map(p => p.balance)).toEqual([1300]);
    });
  });

  describe('the visible window', () => {
    it('excludes points before the window start, even though they still count toward carried-forward balances', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-06-01', amount: 100 }),
        tx({ id: '2', date: '2026-07-10', amount: 50 })
      ], [], { start: '2026-07-01', end: '2026-07-31' });

      expect(result.map(p => p.date)).toEqual(['2026-07-10', '2026-07-31']);
      expect(result.map(p => p.balance)).toEqual([150, 150]);
    });

    it('appends a carried-forward point at the window end when nothing happened that day', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-07-28', amount: 100, balance: 100 })
      ], [], { start: '2026-07-01', end: '2026-07-31' });

      expect(result.map(p => p.date)).toEqual(['2026-07-28', '2026-07-31']);
      expect(result[1]).toEqual({ date: '2026-07-31', income: 0, expenses: 0, balance: 100 });
    });

    it('does not duplicate the point when a transaction already lands exactly on the window end', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-07-31', amount: 50, balance: 50 })
      ], [], { start: '2026-07-01', end: '2026-07-31' });

      expect(result.map(p => p.date)).toEqual(['2026-07-31']);
    });

    it('ignores transactions after the window end entirely', () => {
      const result = buildMovementsBalanceSeries([
        tx({ id: '1', date: '2026-07-31', amount: 50, balance: 50 }),
        tx({ id: '2', date: '2026-08-15', amount: 999, balance: 1049 })
      ], [], { start: '2026-07-01', end: '2026-07-31' });

      expect(result.map(p => p.date)).toEqual(['2026-07-31']);
      expect(result[0].balance).toBe(50);
    });
  });
});
