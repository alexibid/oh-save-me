import { computeChronologicalBalances } from './balance-chain-order.utils';

interface TestTx {
  readonly id: string;
  readonly date: string;
  readonly amount: number;
  readonly balance?: number;
}

describe('computeChronologicalBalances', () => {
  it('reconstructs true order from the file-reported balance chain, even when same-day rows are listed in a scrambled order', () => {

    const previousDayEnd = 3019.79;
    const txs: TestTx[] = [
      { id: 'via_verde', date: '2026-07-31', amount: -11.29, balance: 2949.62 },
      { id: 'sp_spac', date: '2026-07-31', amount: -57.68, balance: 2960.91 },
      { id: 'comissao', date: '2026-07-31', amount: -1.20, balance: 3018.59 },
      { id: 'trf_1431', date: '2026-07-31', amount: 1431.00, balance: 4380.62 },
      { id: 'trf_1563', date: '2026-07-31', amount: 1563.00, balance: 5943.62 }
    ];

    const result = computeChronologicalBalances(txs, previousDayEnd);

    expect(result.map(t => t.id)).toEqual(['comissao', 'sp_spac', 'via_verde', 'trf_1431', 'trf_1563']);
    expect(result[result.length - 1].balance).toBeCloseTo(5943.62, 2);

    expect(result.map(t => t.balance)).toEqual([3018.59, 2960.91, 2949.62, 4380.62, 5943.62]);
  });

  it('recomputes every balance from the given starting balance, never trusting the source column directly', () => {

    const txs: TestTx[] = [
      { id: 'a', date: '2026-01-01', amount: -10, balance: 90 },
      { id: 'b', date: '2026-01-01', amount: 20, balance: 110 }
    ];

    const result = computeChronologicalBalances(txs, 200);

    expect(result.map(t => t.id)).toEqual(['a', 'b']);
    expect(result.map(t => t.balance)).toEqual([190, 210]);
  });

  it('sorts across different dates in ascending order', () => {
    const txs: TestTx[] = [
      { id: 'later', date: '2026-02-01', amount: 10 },
      { id: 'earlier', date: '2026-01-01', amount: 5 }
    ];

    const result = computeChronologicalBalances(txs, 0);

    expect(result.map(t => t.id)).toEqual(['earlier', 'later']);
    expect(result.map(t => t.balance)).toEqual([5, 15]);
  });

  it('falls back to the given order within a day when no transaction carries a reported balance', () => {
    const txs: TestTx[] = [
      { id: 'x', date: '2026-01-01', amount: 10 },
      { id: 'y', date: '2026-01-01', amount: -3 }
    ];

    const result = computeChronologicalBalances(txs, 100);

    expect(result.map(t => t.id)).toEqual(['x', 'y']);
    expect(result.map(t => t.balance)).toEqual([110, 107]);
  });

  it('handles a single transaction with no ordering ambiguity', () => {
    const txs: TestTx[] = [{ id: 'only', date: '2026-01-01', amount: 42, balance: 142 }];

    const result = computeChronologicalBalances(txs, 100);

    expect(result.map(t => t.id)).toEqual(['only']);
    expect(result[0].balance).toBe(142);
  });

  it('returns an empty array for an empty input', () => {
    expect(computeChronologicalBalances([], 0)).toEqual([]);
  });
});
