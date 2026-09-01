import { Injectable, computed } from '@angular/core';
import { useStore } from '@application/app-store';
import { Transaction } from '@domain/models/transaction';
import { classifyRecurringTransactions } from '@domain/shared/recurring-transaction-classifier';
import { outlierExpenseIds } from '@domain/shared/outlier-transaction.utils';

@Injectable({
  providedIn: 'root'
})
export class TransactionClassificationSelectors {
  private readonly store = useStore();

  readonly recurringClassifications = computed(() => classifyRecurringTransactions(this.store.transactions()));

  readonly isRecurring = computed<(t: Transaction) => boolean>(() => {
    const classifications = this.recurringClassifications();
    return (transaction: Transaction) => classifications.get(transaction.id)?.isRecurring ?? false;
  });

  readonly recurringExpenseIds = computed<ReadonlySet<string>>(() => {
    const isRecurring = this.isRecurring();
    return new Set(
      this.store.transactions()
        .filter(t => t.amount < 0 && isRecurring(t))
        .map(t => t.id)
    );
  });

  readonly outlierExpenseIds = computed<ReadonlySet<string>>(() => outlierExpenseIds(this.store.transactions()));
}
