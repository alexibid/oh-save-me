import { Transaction } from '@domain/models/transaction';

export type PositionStatus = 'open' | 'executed';

export interface InvestmentPosition {
  readonly symbol: string;
  readonly assetName: string;
  readonly assetType?: string;
  readonly accountId?: string;
  readonly status: PositionStatus;
  readonly shares: number;
  readonly investedCost: number;
  readonly totalBought: number;
  readonly totalSold: number;
  readonly realizedGain: number;
  readonly income: number;
  readonly firstBuyDate: string;
  readonly lastMovementDate: string;
}

interface PositionAccumulator {
  symbol: string;
  assetName: string;
  assetType?: string;
  accountId?: string;
  boughtShares: number;
  boughtCost: number;
  soldShares: number;
  soldProceeds: number;
  charges: number;
  income: number;
  hasSell: boolean;
  firstBuyDate: string;
  lastMovementDate: string;
}

const SHARE_EPSILON = 1e-6;

export function buildInvestmentPositions(transactions: readonly Transaction[]): readonly InvestmentPosition[] {
  const accumulators = new Map<string, PositionAccumulator>();

  const sorted = [...transactions]
    .filter((transaction): transaction is Transaction & { symbol: string } => !!transaction.symbol)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const transaction of sorted) {
    applyTransaction(accumulatorFor(accumulators, transaction), transaction);
  }

  return [...accumulators.values()].map(toPosition);
}

export function investedValue(positions: readonly InvestmentPosition[]): number {
  const total = positions
    .filter(position => position.status === 'open')
    .reduce((sum, position) => sum + position.investedCost, 0);
  return round(total);
}

export function realizedResult(positions: readonly InvestmentPosition[]): number {
  const total = positions
    .filter(position => position.status === 'executed')
    .reduce((sum, position) => sum + position.realizedGain, 0);
  return round(total);
}

function accumulatorFor(
  accumulators: Map<string, PositionAccumulator>,
  transaction: Transaction & { symbol: string }
): PositionAccumulator {
  const symbol = transaction.symbol;
  const existing = accumulators.get(symbol);
  if (existing) return existing;

  const created: PositionAccumulator = {
    symbol,
    assetName: transaction.assetName ?? symbol,
    assetType: transaction.assetType,
    accountId: transaction.accountId,
    boughtShares: 0,
    boughtCost: 0,
    soldShares: 0,
    soldProceeds: 0,
    charges: 0,
    income: 0,
    hasSell: false,
    firstBuyDate: '',
    lastMovementDate: ''
  };
  accumulators.set(symbol, created);
  return created;
}

function applyTransaction(accumulator: PositionAccumulator, transaction: Transaction): void {
  accumulator.lastMovementDate = transaction.date;
  accumulator.charges += (transaction.fee ?? 0) + (transaction.tax ?? 0);

  if (transaction.investmentType === 'buy') {
    accumulator.boughtShares += transaction.shares ?? 0;
    accumulator.boughtCost += Math.abs(transaction.amount);
    if (!accumulator.firstBuyDate) accumulator.firstBuyDate = transaction.date;
    return;
  }

  if (transaction.investmentType === 'sell') {
    accumulator.hasSell = true;
    accumulator.soldShares += Math.abs(transaction.shares ?? 0);
    accumulator.soldProceeds += Math.abs(transaction.amount);
    return;
  }

  if (transaction.investmentType === 'dividend' || transaction.investmentType === 'interest') {
    accumulator.income += transaction.amount;
  }
}

function toPosition(accumulator: PositionAccumulator): InvestmentPosition {
  const averageCost = accumulator.boughtShares > 0 ? accumulator.boughtCost / accumulator.boughtShares : 0;
  const costOfSold = averageCost * accumulator.soldShares;
  const remainingShares = accumulator.boughtShares - accumulator.soldShares;

  return {
    symbol: accumulator.symbol,
    assetName: accumulator.assetName,
    assetType: accumulator.assetType,
    accountId: accumulator.accountId,
    status: resolveStatus(accumulator, remainingShares),
    shares: round(Math.max(0, remainingShares)),
    investedCost: round(Math.max(0, accumulator.boughtCost - costOfSold)),
    totalBought: round(accumulator.boughtCost),
    totalSold: round(accumulator.soldProceeds),
    realizedGain: round(accumulator.soldProceeds - costOfSold - accumulator.charges),
    income: round(accumulator.income),
    firstBuyDate: accumulator.firstBuyDate,
    lastMovementDate: accumulator.lastMovementDate
  };
}

function resolveStatus(accumulator: PositionAccumulator, remainingShares: number): PositionStatus {
  if (!accumulator.hasSell) return 'open';
  if (accumulator.boughtShares <= 0) return 'executed';
  return remainingShares > SHARE_EPSILON ? 'open' : 'executed';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
