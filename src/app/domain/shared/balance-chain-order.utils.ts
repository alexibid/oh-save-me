export interface BalanceChainInput {
  readonly date: string;
  readonly amount: number;
  readonly balance?: number;
}

const MATCH_TOLERANCE = 0.015;

export function computeChronologicalBalances<T extends BalanceChainInput>(
  transactions: readonly T[],
  startingBalance: number
): readonly (T & { readonly balance: number })[] {
  const dateSorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const result: (T & { readonly balance: number })[] = [];
  let running = startingBalance;
  let index = 0;

  while (index < dateSorted.length) {
    const date = dateSorted[index].date;
    const group: T[] = [];
    while (index < dateSorted.length && dateSorted[index].date === date) {
      group.push(dateSorted[index]);
      index++;
    }

    const remaining = [...group];
    while (remaining.length > 0) {
      const matchIndex = remaining.findIndex(t =>
        t.balance !== undefined && t.balance !== null &&
        Math.abs((t.balance - t.amount) - running) < MATCH_TOLERANCE
      );
      const [next] = remaining.splice(matchIndex !== -1 ? matchIndex : 0, 1);
      running = Math.round((running + next.amount) * 100) / 100;
      result.push({ ...next, balance: running });
    }
  }

  return result;
}
