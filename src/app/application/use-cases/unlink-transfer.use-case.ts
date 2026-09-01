import { Injectable, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { Transaction } from '@domain/models/transaction';

@Injectable({
  providedIn: 'root'
})
export class UnlinkTransferUseCase {
  private readonly store = useStore();
  private readonly transactionRepository = inject(TRANSACTION_REPOSITORY_TOKEN, { optional: true });

  async execute(transactionId: string): Promise<void> {
    const all = this.store.transactions();
    const tx = all.find(t => t.id === transactionId);
    if (!tx || (!tx.linkedTransactionId && !tx.transferAccountId)) return;

    const counterpart = tx.linkedTransactionId ? all.find(t => t.id === tx.linkedTransactionId) : undefined;
    const cleared = [tx, ...(counterpart ? [counterpart] : [])].map(clearLinkFields);

    if (this.transactionRepository) {
      for (const t of cleared) await this.transactionRepository.update(t);
    }

    const updatedAll = all.map(t => cleared.find(c => c.id === t.id) ?? t);
    this.store.setTransactions(updatedAll);
  }
}

function clearLinkFields(tx: Transaction): Transaction {
  const { linkedTransactionId, transferAccountId, ...rest } = tx;
  return rest;
}
