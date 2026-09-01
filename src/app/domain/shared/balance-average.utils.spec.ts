import { describe, it, expect } from 'vitest';
import { BalanceWindow, buildMonthlyNetFlow, windowMonthCount } from './balance-average.utils';
import { Transaction } from '@domain/models/transaction';
import { Account } from '@domain/models/account';

const BANK: Account = {
  id: 'bank', kind: 'financial', name: 'Bank', type: 'bank_account',
  scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR', updatedAt: 0
};
const EXCLUDED: Account = {
  id: 'excluded', kind: 'financial', name: 'Excluded', type: 'bank_account',
  scope: 'individual', includeInConsolidatedBalance: false, unit: 'EUR', updatedAt: 0
};

function tx(id: string, date: string, amount: number, balance: number, extra: Partial<Transaction> = {}): Transaction {
  return { id, date, description: id, amount, category: 'Others', accountId: 'bank', balance, ...extra };
}

function steadyMonths(count: number, startYear = 2025): Transaction[] {
  const out: Transaction[] = [];
  let balance = 3000;
  for (let i = 0; i < count; i++) {
    const year = startYear + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, '0');
    balance += 2000;
    out.push(tx(`in-${i}`, `${year}-${month}-01`, 2000, balance, { category: 'Income' }));
    balance -= 1850;
    out.push(tx(`out-${i}`, `${year}-${month}-20`, -1850, balance, { category: 'groceries' }));
  }
  return out;
}

describe('buildMonthlyNetFlow', () => {
  it('reports income minus expenses, not the balance', () => {
    const points = buildMonthlyNetFlow(steadyMonths(12), [BANK], 'all');
    const middle = points.find(p => p.month === '2025-06');

    expect(middle?.averageNetFlow).toBeCloseTo(150, 0);
  });

  it('keeps the closing balance alongside it, untouched', () => {
    const points = buildMonthlyNetFlow(steadyMonths(3), [BANK], 'all');

    expect(points[0].realBalance).toBe(3150);
    expect(points[1].realBalance).toBe(3300);
  });

  it('cancels a windfall against the payment that follows it inside the same window', () => {
    const base = steadyMonths(24);
    const txs = [
      ...base,
      tx('heranca', '2025-12-20', 25000, 999, { category: 'Others' }),
      tx('amort', '2026-01-07', -25000, 999, { category: 'Others' })
    ];

    const points = buildMonthlyNetFlow(txs, [BANK], 'all');
    const december = points.find(p => p.month === '2025-12');

    expect(december?.averageNetFlow).toBeCloseTo(150, 0);
  });

  it('still shows a one-off that has no matching movement to cancel it', () => {
    const base = steadyMonths(24);
    const txs = [...base, tx('car', '2025-12-10', -7700, 999, { category: 'Others' })];

    const points = buildMonthlyNetFlow(txs, [BANK], 'all');
    const december = points.find(p => p.month === '2025-12');

    expect(december!.averageNetFlow).toBeLessThan(0);
  });

  it('ignores transfers between the user own accounts on both sides', () => {
    const base = steadyMonths(12);
    const txs = [
      ...base,
      tx('out', '2025-06-10', -5000, 999, { category: 'Transfers' }),
      tx('in', '2025-06-11', 5000, 999, { category: 'Transfers' })
    ];

    const points = buildMonthlyNetFlow(txs, [BANK], 'all');

    expect(points.find(p => p.month === '2025-06')?.averageNetFlow).toBeCloseTo(150, 0);
  });

  it('leaves out accounts the user excluded from the consolidated balance', () => {
    const txs = [
      ...steadyMonths(3),
      tx('hidden', '2025-02-10', 9999, 9999, { accountId: 'excluded', category: 'Income' })
    ];

    const points = buildMonthlyNetFlow(txs, [BANK, EXCLUDED], 'all');

    expect(points.find(p => p.month === '2025-02')?.averageNetFlow).toBeCloseTo(150, 0);
  });

  it('reports every month between the first and the last movement, with no gaps', () => {
    const txs = [tx('a', '2026-01-10', -10, 1000), tx('b', '2026-04-10', -10, 990)];

    const points = buildMonthlyNetFlow(txs, [BANK], 'all');

    expect(points.map(p => p.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
  });

  it('does not reach back beyond the 15th of the previous month', () => {
    const txs = [
      ...steadyMonths(6),
      tx('spike', '2025-02-14', -6000, 999, { category: 'Others' })
    ];

    const points = buildMonthlyNetFlow(txs, [BANK], 'all');

    expect(points.find(p => p.month === '2025-04')?.averageNetFlow).toBeCloseTo(150, 0);
  });

  it('does reach back as far as the 15th of the previous month', () => {
    const txs = [
      ...steadyMonths(6),
      tx('spike', '2025-02-16', -6000, 999, { category: 'Others' })
    ];

    const points = buildMonthlyNetFlow(txs, [BANK], 'all');

    expect(points.find(p => p.month === '2025-03')!.averageNetFlow).toBeLessThan(0);
  });

  it.each<[BalanceWindow, number]>([
    ['quarter', 3],
    ['semester', 6],
    ['year', 12]
  ])('keeps only the last months that fit the %s window', (window, expected) => {
    expect(buildMonthlyNetFlow(steadyMonths(24), [BANK], window)).toHaveLength(expected);
    expect(windowMonthCount(window)).toBe(expected);
  });

  it('shows every month there is when the window is set to all time', () => {
    expect(buildMonthlyNetFlow(steadyMonths(24), [BANK], 'all')).toHaveLength(24);
    expect(windowMonthCount('all')).toBeNull();
  });

  it('returns nothing when no movement carries a balance reading', () => {
    const txs: Transaction[] = [
      { id: 'x', date: '2026-01-10', description: 'x', amount: -10, category: 'Others', accountId: 'bank' }
    ];

    expect(buildMonthlyNetFlow(txs, [BANK], 'all')).toEqual([]);
  });
});
