import {
  buildInvestmentPositions,
  investedValue,
  realizedResult
} from './investment-positions.utils';
import { Transaction } from '@domain/models/transaction';
import { MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS } from '@/mocks/transactions.mock';

describe('buildInvestmentPositions', () => {
  const positions = buildInvestmentPositions(MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS);

  it('ignores movements that carry no asset symbol', () => {
    const cash: Transaction[] = [
      { id: 'c1', date: '2026-07-20', description: 'Depósito', amount: 500, category: 'Transfers', investmentType: 'deposit' }
    ];
    expect(buildInvestmentPositions(cash)).toEqual([]);
  });

  it('groups every movement of the same asset into a single position', () => {
    expect(positions.map(p => p.symbol).sort()).toEqual(['AAPL', 'IWDA']);
  });

  it('keeps an asset that was bought and never sold as still held', () => {
    const etf = positions.find(p => p.symbol === 'IWDA')!;
    expect(etf.status).toBe('open');
    expect(etf.shares).toBe(2.5);
    expect(etf.investedCost).toBe(246);
  });

  it('marks an asset as executed once every share was sold', () => {
    const stock = positions.find(p => p.symbol === 'AAPL')!;
    expect(stock.status).toBe('executed');
    expect(stock.shares).toBe(0);
    expect(stock.totalBought).toBe(193.14);
    expect(stock.totalSold).toBe(201.5);
  });

  it('nets fees and taxes out of the realised result', () => {
    expect(positions.find(p => p.symbol === 'AAPL')!.realizedGain).toBe(4.06);
  });

  it('keeps a partly sold asset held, costing only the remaining shares', () => {
    const partial: Transaction[] = [
      MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS[0],
      {
        id: 'p2', date: '2026-07-20', description: 'Venda parcial', amount: 120, category: 'AssetSale',
        investmentType: 'sell', symbol: 'IWDA', shares: 1
      }
    ];
    const [position] = buildInvestmentPositions(partial);
    expect(position.status).toBe('open');
    expect(position.shares).toBe(1.5);
    expect(position.investedCost).toBe(147.6);
  });

  it('collects dividends as income for the asset', () => {
    expect(positions.find(p => p.symbol === 'IWDA')!.income).toBe(15.2);
  });

  it('treats an asset sold without share counts as executed', () => {
    const noShares: Transaction[] = [
      { id: 'n1', date: '2026-07-01', description: 'Compra', amount: -100, category: 'Investments', investmentType: 'buy', symbol: 'XPTO' },
      { id: 'n2', date: '2026-07-09', description: 'Venda', amount: 130, category: 'AssetSale', investmentType: 'sell', symbol: 'XPTO' }
    ];
    expect(buildInvestmentPositions(noShares)[0].status).toBe('executed');
  });

  it('reads the asset name and first purchase date from the movements', () => {
    const etf = positions.find(p => p.symbol === 'IWDA')!;
    expect(etf.assetName).toBe('Global Core MSCI World');
    expect(etf.firstBuyDate).toBe('2026-07-01');
  });
});

describe('investedValue and realizedResult', () => {
  const positions = buildInvestmentPositions(MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS);

  it('counts only what is still held as invested', () => {
    expect(investedValue(positions)).toBe(246);
  });

  it('counts only closed positions in the realised result', () => {
    expect(realizedResult(positions)).toBe(4.06);
  });

  it('returns zero without any position', () => {
    expect(investedValue([])).toBe(0);
    expect(realizedResult([])).toBe(0);
  });
});
