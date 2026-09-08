import { buildAssetBalanceHistory } from './asset-balance-history.utils';
import { Transaction } from '@domain/models/transaction';
import { MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS } from '@/mocks/transactions.mock';

describe('buildAssetBalanceHistory', () => {
  it('returns nothing without any asset movement', () => {
    expect(buildAssetBalanceHistory([])).toEqual([]);
  });

  it('ignores dividends, interest and plain cash movements', () => {
    const noise: Transaction[] = [
      { id: 'd1', date: '2026-07-15', description: 'Dividendos', amount: 15.2, category: 'Dividends', investmentType: 'dividend', symbol: 'IWDA' },
      { id: 'c1', date: '2026-07-20', description: 'Deposit', amount: 500, category: 'Transfers', investmentType: 'deposit' }
    ];
    expect(buildAssetBalanceHistory(noise)).toEqual([]);
  });

  it('accumulates purchases into a running balance', () => {
    const buys: Transaction[] = [
      { id: 'b1', date: '2026-05-05', description: 'Compra', amount: -150, category: 'Investments', investmentType: 'buy', symbol: 'IWDA' },
      { id: 'b2', date: '2026-06-05', description: 'Compra', amount: -200, category: 'Investments', investmentType: 'buy', symbol: 'IWDA' }
    ];
    expect(buildAssetBalanceHistory(buys).map(p => p.balance)).toEqual([150, 350]);
  });

  it('lowers the balance when an asset is sold', () => {
    const points = buildAssetBalanceHistory(MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS);
    const [july] = points;
    expect(july.month).toBe('2026-07');
    expect(july.balance).toBe(237.64);
  });

  it('never lets the balance fall below zero', () => {
    const overSold: Transaction[] = [
      { id: 'b', date: '2026-05-05', description: 'Compra', amount: -100, category: 'Investments', investmentType: 'buy', symbol: 'IWDA' },
      { id: 's', date: '2026-06-05', description: 'Venda', amount: 400, category: 'AssetSale', investmentType: 'sell', symbol: 'IWDA' }
    ];
    expect(buildAssetBalanceHistory(overSold).map(p => p.balance)).toEqual([100, 0]);
  });

  it('fills the months in between so the line never skips a gap', () => {
    const sparse: Transaction[] = [
      { id: 'a', date: '2026-01-05', description: 'Compra', amount: -100, category: 'Investments', investmentType: 'buy', symbol: 'IWDA' },
      { id: 'b', date: '2026-04-05', description: 'Compra', amount: -100, category: 'Investments', investmentType: 'buy', symbol: 'IWDA' }
    ];
    const points = buildAssetBalanceHistory(sparse);
    expect(points.map(p => p.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
    expect(points.map(p => p.balance)).toEqual([100, 100, 100, 200]);
  });

  it('crosses the year boundary correctly', () => {
    const across: Transaction[] = [
      { id: 'a', date: '2025-12-05', description: 'Compra', amount: -100, category: 'Investments', investmentType: 'buy', symbol: 'IWDA' },
      { id: 'b', date: '2026-01-05', description: 'Compra', amount: -50, category: 'Investments', investmentType: 'buy', symbol: 'IWDA' }
    ];
    expect(buildAssetBalanceHistory(across).map(p => p.month)).toEqual(['2025-12', '2026-01']);
  });
});
