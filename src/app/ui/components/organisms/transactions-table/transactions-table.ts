import { Component, EventEmitter, Input, Output, signal, inject, forwardRef, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo, CategoryType } from '@domain/models/category';
import { Account } from '@domain/models/account';
import { TRANSACTION_LIST_SCHEMA } from '@domain/models/transaction-list-schema';
import { RecordListSchema } from '@domain/models/record-list-schema';
import { TableTab, TableSortField } from '@domain/models/record-list';
import { exploreTransactions } from '@application/use-cases/explore-transactions.use-case';
import { useStore } from '@application/app-store';
import { computed } from '@angular/core';
import { CategoryRecategorizeComponent, CategoryAppliedEvent } from '@ui/components/organisms/category-recategorize/category-recategorize';
import { RecordDetailBalloonComponent } from '@ui/components/molecules/record-detail-balloon/record-detail-balloon';
import { TransactionsTableHeaderComponent } from '@ui/components/molecules/transactions-table-header/transactions-table-header';

import { I18N_SHARED, I18nService, translate } from '@ui/shared/i18n-shared';
import { classifyRecurringTransactions } from '@domain/shared/recurring-transaction-classifier';
import { countsAsIncome } from '@domain/shared/essential-spending.utils';
import {
  CollectionListComponent,
  CurrencyDisplayComponent,
  EmptyStateComponent,
  HandDrawnDirective,
  IconComponent,
  InfoBalloonComponent,
  SegmentOption,
  SmartCurrencyCellComponent,
  SmartDateCellComponent,
  SmartIconCellComponent,
  SmartTextCellComponent
} from 'ibid-ui';

const LOAD_MORE_INCREMENT = 20;

@Component({
  selector: 'ohsaveme-transactions-table',
  standalone: true,
  imports: [
    CollectionListComponent,
    CurrencyDisplayComponent,
    CommonModule,
    HandDrawnDirective,
    IconComponent,
    forwardRef(() => CategoryRecategorizeComponent),
    SmartIconCellComponent,
    SmartTextCellComponent,
    SmartDateCellComponent,
    SmartCurrencyCellComponent,
    EmptyStateComponent,
    RecordDetailBalloonComponent,
    InfoBalloonComponent,
    TransactionsTableHeaderComponent,
    I18N_SHARED
  ],
  templateUrl: './transactions-table.html',
  styleUrl: './transactions-table.scss'
})
export class TransactionsTableComponent {
  protected readonly i18n = inject(I18nService);

  @Input() schema: RecordListSchema<Transaction> = TRANSACTION_LIST_SCHEMA;
  @Input({ required: true }) transactions!: readonly Transaction[];
  @Input({ required: true }) categoryOptions!: CategoryInfo[];
  @Input() showCategory = true;
  @Input() showActions = false;
  @Input() visibleTabs: TableTab[] = ['all', 'top20', 'credit', 'debit'];
  @Input() accounts: readonly Account[] = [];
  @Input() fullBleedMobile = false;
  @Input() sumModeEnabled = false;
  @Input() selectedForSum: ReadonlySet<string> = new Set();
  @Input() showSumToggle = false;
  @Input() excludeTransfers = false;
  @Input() showHeader = true;
  @Input() showTitle = true;
  @Input() showTabs = true;
  @Input() showSort = true;
  @Input() showSearch = false;
  @Input() searchQuery = '';

  @Input() selectionMode = false;
  @Input() selectedIds: ReadonlySet<string> = new Set();

  @Input() metaTemplate?: TemplateRef<{ $implicit: Transaction }>;
  @Input() trailingTemplate?: TemplateRef<{ $implicit: Transaction }>;

  @Output() categoryApplied = new EventEmitter<CategoryAppliedEvent>();
  @Output() budgetApplied = new EventEmitter<{ transactionId: string; budgetId: string | undefined }>();
  @Output() createCategoryClick = new EventEmitter<void>();
  @Output() pinToggle = new EventEmitter<Transaction>();
  @Output() recurringToggle = new EventEmitter<Transaction>();
  @Output() incomeToggle = new EventEmitter<Transaction>();
  @Output() sumSelectionToggle = new EventEmitter<string>();
  @Output() selectionToggle = new EventEmitter<string>();
  @Output() sumModeChange = new EventEmitter<boolean>();
  @Output() excludeTransfersChange = new EventEmitter<boolean>();
  @Output() searchQueryChange = new EventEmitter<string>();

  private readonly store = useStore();

  protected readonly activeProjects = computed(() => {
    if (typeof this.store.budgets !== 'function') {
      return [];
    }
    return this.store.budgets().filter(b => b.type === 'project' && !b.isClosed);
  });

  protected readonly recurringClassifications = computed(() => {
    const history = typeof this.store.transactions === 'function' ? this.store.transactions() : this.transactions;
    return classifyRecurringTransactions(history);
  });

  protected isRecurringTransaction(tx: Transaction): boolean {
    return this.recurringClassifications().get(tx.id)?.isRecurring ?? false;
  }

  protected isRecurrenceConfirmed(tx: Transaction): boolean {
    return this.recurringClassifications().get(tx.id)?.confirmedByOwner ?? false;
  }

  protected recurrenceLabelKey(tx: Transaction): string {
    if (this.isRecurrenceConfirmed(tx)) {
      return this.isRecurringTransaction(tx) ? 'recurringConfirmedLabel' : 'recurringRejectedLabel';
    }
    return this.isRecurringTransaction(tx) ? 'recurringSuggestedLabel' : 'recurringMarkLabel';
  }

  protected isCountedIncome(tx: Transaction): boolean {
    return countsAsIncome(tx);
  }

  protected incomeLabelKey(tx: Transaction): string {
    return this.isCountedIncome(tx) ? 'incomeCountedLabel' : 'incomeExcludedLabel';
  }

  protected onToggleIncome(tx: Transaction): void {
    this.incomeToggle.emit(tx);
  }

  protected onToggleRecurring(tx: Transaction): void {
    this.recurringToggle.emit(tx);
  }

  protected getAvailableProjects(tx: Transaction) {
    const active = this.activeProjects();
    if (tx.budgetId) {
      const alreadyHas = active.some(b => b.id === tx.budgetId);
      if (!alreadyHas && typeof this.store.budgets === 'function') {
        const found = this.store.budgets().find(b => b.id === tx.budgetId);
        if (found) {
          return [...active, found];
        }
      }
    }
    return active;
  }

  protected readonly activeTab = signal<TableTab>('all');
  protected readonly pageSize = signal<number>(20);
  protected readonly pinnedIds = signal<Set<string>>(new Set<string>());
  protected readonly sortField = signal<TableSortField | null>('date');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected isSticky = signal<boolean>(false);

  protected toggleSort(field: TableSortField) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'description' || field === 'category' ? 'asc' : 'desc');
    }
  }

  protected get hasBalanceData(): boolean {
    return this.transactions.some(t => t.balance !== undefined && t.balance !== null);
  }

  protected getLinkedAccountName(tx: Transaction): string {
    if (!tx.transferAccountId) return '';
    return this.accounts.find(a => a.id === tx.transferAccountId)?.name ?? '';
  }

  protected getAccountName(tx: Transaction): string {
    if (!tx.account) return '';
    return this.accounts.find(a => a.id === tx.account)?.name ?? tx.account;
  }

  private get categoryById(): Map<string, CategoryInfo> {
    return new Map(this.categoryOptions.map(c => [c.id, c]));
  }

  protected categoryIconFor(categoryId: string): string {
    return this.categoryById.get(categoryId)?.icon ?? 'help';
  }

  protected categoryColorFor(categoryId: string): string | undefined {
    return this.categoryById.get(categoryId)?.color;
  }

  protected get tabOptions(): SegmentOption[] {
    const labels: Record<TableTab, string> = {
      all: translate(this.i18n, 'showAll'),
      top20: translate(this.i18n, 'tabTop20'),
      credit: translate(this.i18n, 'tabCredit'),
      debit: translate(this.i18n, 'tabDebit')
    };

    return this.visibleTabs.map(tabKey => ({
      value: tabKey,
      label: labels[tabKey]
    }));
  }

  private get exploredTransactions(): readonly Transaction[] {
    const activeSelectedIds = this.sumModeEnabled ? this.selectedForSum : this.selectedIds;
    return exploreTransactions({
      transactions: this.transactions,
      schema: this.schema,
      searchQuery: this.searchQuery,
      tab: this.activeTab(),
      sortField: this.sortField(),
      sortDirection: this.sortDirection(),
      pinnedIds: this.pinnedIds(),
      selectedIds: activeSelectedIds
    });
  }

  get displayTransactions(): readonly Transaction[] {
    const all = this.exploredTransactions;
    return this.activeTab() === 'top20' ? all : all.slice(0, this.pageSize());
  }

  get canLoadMore(): boolean {
    return this.activeTab() !== 'top20' && this.exploredTransactions.length > this.displayTransactions.length;
  }

  protected get selectedGroup(): readonly Transaction[] {
    return this.displayTransactions.filter(tx => this.isSelectedForSum(tx.id));
  }

  protected get unselectedGroup(): readonly Transaction[] {
    return this.displayTransactions.filter(tx => !this.isSelectedForSum(tx.id));
  }

  protected get selectedTotal(): number {
    const counted = this.excludeTransfers
      ? this.selectedGroup.filter(tx => !tx.linkedTransactionId)
      : this.selectedGroup;
    return counted.reduce((sum, tx) => sum + tx.amount, 0);
  }

  onTabChange(value: string) {
    this.activeTab.set(value as TableTab);
    this.pageSize.set(20);
  }

  onLoadMore(): void {
    this.pageSize.set(this.pageSize() + LOAD_MORE_INCREMENT);
  }

  onCategoryChange(tx: Transaction, newCategory: CategoryType) {
    this.categoryApplied.emit({ updatedTransactions: [{ ...tx, category: newCategory }], keyword: '' });
  }

  onTogglePin(tx: Transaction) {
    const set = new Set(this.pinnedIds());
    if (set.has(tx.id)) {
      set.delete(tx.id);
    } else {
      set.add(tx.id);
    }
    this.pinnedIds.set(set);
    this.pinToggle.emit(tx);
  }

  isPinned(txId: string): boolean {
    return this.pinnedIds().has(txId);
  }

  isSelectedForSum(txId: string): boolean {
    return this.selectedForSum.has(txId);
  }

  isSelectedForSelection(txId: string): boolean {
    return this.selectedIds.has(txId);
  }
}
