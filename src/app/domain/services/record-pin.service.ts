import { Transaction } from '@domain/models/transaction';

export function applyPinPriority(
  transactions: readonly Transaction[],
  pinnedIds: ReadonlySet<string>
): readonly Transaction[] {
  return [...transactions].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id);
    const bPinned = pinnedIds.has(b.id);
    if (aPinned === bPinned) return 0;
    return aPinned ? -1 : 1;
  });
}
