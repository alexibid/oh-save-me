import { signal } from '@angular/core';

export class TransactionSumSelection {
  readonly enabled = signal(false);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly excludeTransfers = signal(false);

  setEnabled(enabled: boolean): void {
    this.enabled.set(enabled);
    if (!enabled) this.clear();
  }

  setExcludeTransfers(exclude: boolean): void {
    this.excludeTransfers.set(exclude);
  }

  isSelected(transactionId: string): boolean {
    return this.selectedIds().has(transactionId);
  }

  select(transactionId: string, selected: boolean): void {
    const next = new Set(this.selectedIds());
    if (selected) next.add(transactionId); else next.delete(transactionId);
    this.selectedIds.set(next);
  }

  toggle(transactionId: string): void {
    this.select(transactionId, !this.isSelected(transactionId));
  }

  selectAll(transactionIds: readonly string[]): void {
    this.selectedIds.set(new Set(transactionIds));
  }

  clear(): void {
    this.selectedIds.set(new Set());
  }

  areAllSelected(transactionIds: readonly string[]): boolean {
    return transactionIds.length > 0 && transactionIds.every(id => this.isSelected(id));
  }
}
