import { Injectable } from '@angular/core';
import { useStore } from '@application/app-store';
import { Transaction } from '@domain/models/transaction';
import {
  defaultSimilarityKeyword,
  matchesSimilarityKeyword
} from '@domain/shared/similar-transactions.utils';

@Injectable({ providedIn: 'root' })
export class ConfirmRecurringExpenseUseCase {
  private readonly store = useStore();

  async confirm(transaction: Transaction): Promise<void> {
    await this.applyToGroup(transaction, true);
  }

  async reject(transaction: Transaction): Promise<void> {
    await this.applyToGroup(transaction, false);
  }

  async clear(transaction: Transaction): Promise<void> {
    await this.applyToGroup(transaction, undefined);
  }

  private async applyToGroup(transaction: Transaction, isRecurring: boolean | undefined): Promise<void> {
    await Promise.all(this.siblingsOf(transaction).map(sibling =>
      this.store.updateTransactionRecurrence(sibling, isRecurring)
    ));
  }

  private siblingsOf(transaction: Transaction): readonly Transaction[] {
    const keyword = defaultSimilarityKeyword(transaction.description);
    return this.store.transactions().filter(candidate =>
      matchesSimilarityKeyword(candidate.description, keyword)
    );
  }
}
