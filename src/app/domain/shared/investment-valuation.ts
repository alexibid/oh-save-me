import { Transaction } from '@domain/models/transaction';

export function calculateInvestedValue(transactions: readonly Transaction[]): number {
  const positions = new Map<string, { shares: number; totalCost: number }>();

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  for (const tx of sorted) {
    if (!tx.symbol) continue;

    if (tx.investmentType === 'buy') {
      const pos = positions.get(tx.symbol) ?? { shares: 0, totalCost: 0 };
      pos.shares += tx.shares ?? 0;
      pos.totalCost += Math.abs(tx.amount);
      positions.set(tx.symbol, pos);
    } else if (tx.investmentType === 'sell') {
      const pos = positions.get(tx.symbol) ?? { shares: 0, totalCost: 0 };
      const soldShares = Math.abs(tx.shares ?? 0);
      const avgCost = pos.shares > 0 ? pos.totalCost / pos.shares : 0;
      pos.shares -= soldShares;
      pos.totalCost -= avgCost * soldShares;
      positions.set(tx.symbol, pos);
    }
  }

  let total = 0;
  for (const pos of positions.values()) {
    if (pos.shares > 1e-6) {
      total += pos.totalCost;
    }
  }

  return Math.round(total * 100) / 100;
}

export function calculateCashBalance(transactions: readonly Transaction[]): number {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  return Math.round(total * 100) / 100;
}
