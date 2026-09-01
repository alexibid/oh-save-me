import { calculateCashBalance, calculateInvestedValue } from './investment-valuation';
import { Transaction } from '@domain/models/transaction';

function tx(partial: Partial<Transaction> & { id: string; date: string; amount: number }): Transaction {
  return {
    description: 'test',
    category: 'Others',
    ...partial
  };
}

describe('calculateCashBalance', () => {
  it('should sum every transaction amount, buys and sells included', () => {
    const transactions = [
      tx({ id: 't1', date: '2026-01-01', amount: 1000, investmentType: 'deposit' }),
      tx({ id: 't2', date: '2026-01-02', amount: -300, investmentType: 'buy' }),
      tx({ id: 't3', date: '2026-01-03', amount: 50, investmentType: 'dividend' })
    ];

    expect(calculateCashBalance(transactions)).toBe(750);
  });

  it('should return 0 for no transactions', () => {
    expect(calculateCashBalance([])).toBe(0);
  });
});

describe('calculateInvestedValue', () => {
  it('should value a single buy at its cost', () => {
    const transactions = [
      tx({ id: 't1', date: '2026-01-01', amount: -100, investmentType: 'buy', symbol: 'ABC', shares: 10 })
    ];

    expect(calculateInvestedValue(transactions)).toBe(100);
  });

  it('should sum multiple buys of the same symbol', () => {
    const transactions = [
      tx({ id: 't1', date: '2026-01-01', amount: -100, investmentType: 'buy', symbol: 'ABC', shares: 10 }),
      tx({ id: 't2', date: '2026-01-02', amount: -50, investmentType: 'buy', symbol: 'ABC', shares: 5 })
    ];

    expect(calculateInvestedValue(transactions)).toBe(150);
  });

  it('should reduce the position by average cost, not sale price, when fully sold', () => {
    const transactions = [

      tx({ id: 't1', date: '2026-01-01', amount: -100, investmentType: 'buy', symbol: 'ABC', shares: 10 }),
      tx({ id: 't2', date: '2026-01-02', amount: 150, investmentType: 'sell', symbol: 'ABC', shares: 10 })
    ];

    expect(calculateInvestedValue(transactions)).toBe(0);
  });

  it('should keep the cost basis of shares still held after a partial sell', () => {
    const transactions = [

      tx({ id: 't1', date: '2026-01-01', amount: -100, investmentType: 'buy', symbol: 'ABC', shares: 10 }),
      tx({ id: 't2', date: '2026-01-02', amount: 60, investmentType: 'sell', symbol: 'ABC', shares: 4 })
    ];

    expect(calculateInvestedValue(transactions)).toBe(60);
  });

  it('should track multiple symbols independently', () => {
    const transactions = [
      tx({ id: 't1', date: '2026-01-01', amount: -100, investmentType: 'buy', symbol: 'ABC', shares: 10 }),
      tx({ id: 't2', date: '2026-01-01', amount: -200, investmentType: 'buy', symbol: 'XYZ', shares: 20 }),
      tx({ id: 't3', date: '2026-01-02', amount: 100, investmentType: 'sell', symbol: 'ABC', shares: 10 })
    ];

    expect(calculateInvestedValue(transactions)).toBe(200);
  });

  it('should ignore transactions without a symbol (deposits, dividends, fees)', () => {
    const transactions = [
      tx({ id: 't1', date: '2026-01-01', amount: 1000, investmentType: 'deposit' }),
      tx({ id: 't2', date: '2026-01-02', amount: 5, investmentType: 'dividend' }),
      tx({ id: 't3', date: '2026-01-03', amount: -100, investmentType: 'buy', symbol: 'ABC', shares: 10 })
    ];

    expect(calculateInvestedValue(transactions)).toBe(100);
  });

  it('should process out-of-order input correctly by sorting by date first', () => {

    const transactions = [
      tx({ id: 't2', date: '2026-01-02', amount: 60, investmentType: 'sell', symbol: 'ABC', shares: 4 }),
      tx({ id: 't1', date: '2026-01-01', amount: -100, investmentType: 'buy', symbol: 'ABC', shares: 10 })
    ];

    expect(calculateInvestedValue(transactions)).toBe(60);
  });

  it('should return 0 for no transactions', () => {
    expect(calculateInvestedValue([])).toBe(0);
  });
});
