import { Component, inject, computed, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { TransactionClassificationSelectors } from '@application/selectors/transaction-classification.selectors';
import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { matchesProjectBudget } from '@domain/shared/project-transaction.utils';
import { CategoryAppliedEvent } from '@ui/components/organisms/category-recategorize/category-recategorize';
import { BottomSheetDialogComponent, IconComponent, SearchInputComponent } from 'ibid-ui';

export interface AllocationMovementsDialogData {
  budget: Budget;
  titleKey?: string;
}

export interface DisplayItem {
  readonly isGroup: boolean;
  readonly id: string;
  readonly dateDisplay: string;
  readonly accountDisplay: string;
  readonly description: string;
  readonly amountDisplay: number;
  readonly rawTransactions: Transaction[];
}

@Component({
  selector: 'ohsaveme-allocation-movements-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    IconComponent,
    BottomSheetDialogComponent,
    SearchInputComponent,
    TransactionsTableComponent,
    ...I18N_SHARED
],
  templateUrl: './allocation-movements-dialog.html',
  styleUrl: './allocation-movements-dialog.scss'
})
export class AllocationMovementsDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly classifications = inject(TransactionClassificationSelectors);
  private readonly store = useStore();
  protected readonly dialogRef = inject<DialogRef<void>>(DialogRef);
  protected readonly data = inject<AllocationMovementsDialogData>(DIALOG_DATA);

  protected readonly activeTab = signal<'associated' | 'available'>('associated');
  protected readonly searchQuery = signal<string>('');
  protected readonly sortBy = signal<'date' | 'amount'>('date');
  protected readonly sortOrder = signal<'asc' | 'desc'>('desc');
  protected readonly groupByDescription = signal<boolean>(false);

  get budget(): Budget {
    return this.data.budget;
  }

  get lang() {
    return this.i18n.currentLang();
  }

  protected toggleSort(column: 'date' | 'amount') {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('desc');
    }
  }

  private belongsToPeriod(t: Transaction): boolean {
    const b = this.budget;

    const startDate = b.startDate || this.store.startDate();
    const endDate = b.endDate || this.store.endDate();
    return t.date >= startDate && t.date <= endDate;
  }

  protected readonly titleKey = this.data.titleKey ?? 'budgetMovementsTitle';

  protected readonly categoryOptions = computed(() => this.store.categories());

  private readonly isRecurring = this.classifications.isRecurring;

  protected readonly associatedTransactions = computed<Transaction[]>(() => {
    const txs = this.store.transactions();
    const b = this.budget;
    const filterEndDate = b.endDate || this.store.endDate();
    const query = this.searchQuery().toLowerCase().trim();
    const isRecurring = this.isRecurring();

    return txs.filter(t => {
      if (!matchesProjectBudget(t, b, filterEndDate, isRecurring)) return false;
      if (query && !t.description.toLowerCase().includes(query)) return false;
      return true;
    });
  });

  protected readonly availableTransactions = computed<Transaction[]>(() => {
    const txs = this.store.transactions();
    const b = this.budget;
    const filterEndDate = b.endDate || this.store.endDate();
    const query = this.searchQuery().toLowerCase().trim();
    const isRecurring = this.isRecurring();

    return txs.filter(t => {
      if (matchesProjectBudget(t, b, filterEndDate, isRecurring)) return false;

      if (query) {
        return (
          t.description.toLowerCase().includes(query) ||
          (t.account && t.account.toLowerCase().includes(query)) ||
          (t.category && t.category.toLowerCase().includes(query))
        );
      }

      return true;
    });
  });

  protected readonly associatedItems = computed<DisplayItem[]>(() => {
    const filtered = this.associatedTransactions();
    return this.toDisplayItems(filtered);
  });

  protected readonly availableItems = computed<DisplayItem[]>(() => {
    const filtered = this.availableTransactions();
    return this.toDisplayItems(filtered);
  });

  private toDisplayItems(txs: Transaction[]): DisplayItem[] {
    const isGrouped = this.groupByDescription();
    const sortField = this.sortBy();
    const order = this.sortOrder();

    let items: DisplayItem[] = [];

    if (isGrouped) {

      const groups = new Map<string, Transaction[]>();
      txs.forEach(t => {
        const descKey = t.description.trim();
        const group = groups.get(descKey);
        if (group) {
          group.push(t);
        } else {
          groups.set(descKey, [t]);
        }
      });

      groups.forEach((list, desc) => {
        const total = list.reduce((sum, t) => sum + t.amount, 0);
        const dates = list.map(t => t.date).sort();
        const dateRange = dates.length > 1
          ? `${this.i18n.formatDate(dates[0])} - ${this.i18n.formatDate(dates[dates.length - 1])}`
          : this.i18n.formatDate(dates[0]);

        const uniqueAccounts = Array.from(new Set(list.map(t => t.account || 'Geral')));
        const accDisplay = uniqueAccounts.length > 1
          ? `${uniqueAccounts[0]} (+${uniqueAccounts.length - 1})`
          : uniqueAccounts[0];

        items.push({
          isGroup: true,
          id: desc,
          dateDisplay: dateRange,
          accountDisplay: accDisplay,
          description: `${desc} (${list.length}x)`,
          amountDisplay: total,
          rawTransactions: list
        });
      });

      items.sort((a, b) => {
        let comp = 0;
        if (sortField === 'date') {
          comp = a.dateDisplay.localeCompare(b.dateDisplay);
        } else if (sortField === 'amount') {
          comp = a.amountDisplay - b.amountDisplay;
        }
        return order === 'asc' ? comp : -comp;
      });

    } else {

      const sortedTxs = [...txs].sort((a, b) => {
        let comp = 0;
        if (sortField === 'date') {
          comp = a.date.localeCompare(b.date);
        } else if (sortField === 'amount') {
          comp = a.amount - b.amount;
        }
        return order === 'asc' ? comp : -comp;
      });

      items = sortedTxs.map(t => ({
        isGroup: false,
        id: t.id,
        dateDisplay: this.i18n.formatDate(t.date),
        accountDisplay: t.account || (this.lang === 'pt' ? 'Geral' : 'General'),
        description: t.description,
        amountDisplay: t.amount,
        rawTransactions: [t]
      }));
    }

    return items;
  }

  protected async onCategoryApplied(event: CategoryAppliedEvent) {
    await this.store.applyTransactionCategories(event.updatedTransactions);
    if (event.keyword) {
      const first = event.updatedTransactions[0];
      if (first) {
        this.store.learnCategoryRule(event.keyword, first.category);
      }
    }
  }

  protected readonly associatedIds = computed<ReadonlySet<string>>(() =>
    new Set(this.associatedTransactions().map(transaction => transaction.id))
  );

  protected async onAssociationToggle(transactionId: string): Promise<void> {
    const transaction = this.store.transactions().find(t => t.id === transactionId);
    if (!transaction) return;

    const associate = !this.associatedIds().has(transactionId);
    const targetBudgetId = associate ? this.budget.id : undefined;

    for (const target of this.transactionsAffectedBy(transaction, associate)) {
      await this.store.updateTransactionBudget(target, targetBudgetId);
    }
  }

  protected async onSelectAllListed(): Promise<void> {
    const associating = this.activeTab() === 'available';
    const listed = associating ? this.availableTransactions() : this.associatedTransactions();
    const targetBudgetId = associating ? this.budget.id : undefined;

    await this.store.applyTransactionsBudget(listed, targetBudgetId);
  }

  private transactionsAffectedBy(transaction: Transaction, associate: boolean): readonly Transaction[] {
    if (!this.groupByDescription()) return [transaction];

    const descriptionKey = transaction.description.trim();
    const pool = associate ? this.availableTransactions() : this.associatedTransactions();

    const siblings = pool.filter(candidate => candidate.description.trim() === descriptionKey);
    return siblings.length > 0 ? siblings : [transaction];
  }

  protected async onBudgetApplied(event: { transactionId: string; budgetId: string | undefined }) {
    const tx = this.store.transactions().find(t => t.id === event.transactionId);
    if (tx) {
      await this.store.updateTransactionBudget(tx, event.budgetId);
    }
  }

  protected onClose() {
    this.dialogRef.close();
  }
}
