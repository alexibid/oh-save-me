import { Injectable, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { findTransferLinks, repairAsymmetricTransferLinks } from '@domain/shared/transfer.utils';

export interface TransferLinkSummary {
  readonly repairedCount: number;
  readonly newlyLinkedPairs: number;
}

@Injectable({
  providedIn: 'root'
})
export class LinkInternalTransfersUseCase {
  private readonly store = useStore();
  private readonly transactionRepository = inject(TRANSACTION_REPOSITORY_TOKEN, { optional: true });

  async execute(): Promise<TransferLinkSummary> {
    const all = this.store.transactions();

    const repairPatches = repairAsymmetricTransferLinks(all);
    const repaired = all.map(tx => repairPatches.has(tx.id) ? { ...tx, ...repairPatches.get(tx.id) } : tx);

    const newPatches = findTransferLinks(repaired);
    const summary: TransferLinkSummary = { repairedCount: repairPatches.size, newlyLinkedPairs: newPatches.size / 2 };

    const patches = new Map([...repairPatches, ...newPatches]);
    if (patches.size === 0) return summary;

    const updatedAll = all.map(tx => patches.has(tx.id) ? { ...tx, ...patches.get(tx.id) } : tx);

    if (this.transactionRepository) {
      for (const id of patches.keys()) {
        const tx = updatedAll.find(t => t.id === id);
        if (tx) await this.transactionRepository.update(tx);
      }
    }

    this.store.setTransactions(updatedAll);
    return summary;
  }
}
