import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges, inject, ViewChild, TemplateRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo, CategoryType } from '@domain/models/category';
import { CategoryAppliedEvent } from '@ui/components/organisms/category-recategorize/category-recategorize';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { useStore } from '@application/app-store';
import { BottomSheetDialogComponent } from 'ibid-ui';

export type TriageSortField = 'date' | 'description' | 'amount' | 'category';

@Component({
  selector: 'ohsaveme-import-triage-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    BottomSheetDialogComponent,
    TransactionsTableComponent,
    ...I18N_SHARED
  ],

  templateUrl: './import-triage-dialog.html',
  styleUrl: './import-triage-dialog.scss'
})
export class ImportTriageDialog implements OnChanges, OnDestroy {
  @ViewChild('dialogTemplate') dialogTemplate?: TemplateRef<unknown>;

  protected readonly i18n = inject(I18nService);
  private readonly store = useStore();
  private readonly dialog = inject(Dialog);
  private dialogRef?: DialogRef<unknown>;

  @Input() visible = false;
  @Input({ required: true }) transactions: readonly Transaction[] = [];
  @Input() categories: CategoryInfo[] = [];
  @Input() accountType?: string;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<readonly Transaction[]>();
  @Output() resolved = new EventEmitter<Transaction[]>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly sortField = signal<TriageSortField | null>(null);
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');

  protected toggleSort(field: TriageSortField) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'description' || field === 'category' ? 'asc' : 'desc');
    }
  }

  protected readonly displayTransactions = computed(() => {
    const list = [...this.rowTransactions()];
    const sField = this.sortField();
    if (!sField) return list;

    const mult = this.sortDirection() === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      if (sField === 'date') return mult * a.date.localeCompare(b.date);
      if (sField === 'description') return mult * a.description.localeCompare(b.description);
      if (sField === 'category') return mult * (a.category || '').localeCompare(b.category || '');
      if (sField === 'amount') return mult * (a.amount - b.amount);
      return 0;
    });
  });

  protected readonly totalCount = computed(() => this.transactions.length);
  protected readonly autoCategorizedCount = computed(() => this.transactions.filter(t => t.category !== 'Others').length);
  protected readonly needsReviewCount = computed(() => this.transactions.filter(t => t.category === 'Others').length);

  private readonly categoryMap = signal<Map<string, CategoryType>>(new Map());
  private readonly acceptedMap = signal<Map<string, boolean>>(new Map());
  private readonly mlSuggestedCategoryMap = signal<Map<string, CategoryType>>(new Map());
  private readonly budgetMap = signal<Map<string, string | undefined>>(new Map());

  private openTimeout?: ReturnType<typeof setTimeout>;

  protected readonly visibleCategories = computed<CategoryInfo[]>(() => {
    const cats = this.categories.length > 0 ? this.categories : this.store.categories();
    if (this.accountType === 'investment') {
      return cats.filter(c => c.accountTypes && c.accountTypes.includes('investment'));
    }
    return cats;
  });

  protected readonly rowTransactions = computed<readonly Transaction[]>(() => {
    return this.transactions.map(t => this.getRowTransaction(t));
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        this.initializeState();
        if (this.openTimeout) clearTimeout(this.openTimeout);
        this.openTimeout = setTimeout(() => this.openDialog());
      } else {
        this.closeDialog();
      }
    }
  }

  ngOnDestroy() {
    if (this.openTimeout) {
      clearTimeout(this.openTimeout);
    }
    this.closeDialog();
  }

  private initializeState() {
    const cats = new Map<string, CategoryType>();
    const acc = new Map<string, boolean>();
    const mls = new Map<string, CategoryType>();
    const bdg = new Map<string, string | undefined>();

    this.transactions.forEach(tx => {
      cats.set(tx.id, tx.category);
      acc.set(tx.id, tx.category !== 'Others');
      mls.set(tx.id, tx.category);
      bdg.set(tx.id, tx.budgetId);
    });

    this.categoryMap.set(cats);
    this.acceptedMap.set(acc);
    this.mlSuggestedCategoryMap.set(mls);
    this.budgetMap.set(bdg);
  }

  private openDialog() {
    if (!this.dialogRef && this.dialogTemplate) {
      this.dialogRef = this.dialog.open(this.dialogTemplate, {
        width: '95vw',
        maxWidth: '800px',
        disableClose: true,
        panelClass: 'o-import-triage-dialog-panel'
      });
      this.dialogRef.closed.subscribe(() => {
        this.dialogRef = undefined;
        this.visibleChange.emit(false);
      });
    }
  }

  private closeDialog() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = undefined;
    }
  }

  protected getTransactionCategory(id: string): CategoryType {
    return this.categoryMap().get(id) ?? 'Others';
  }

  protected getRowTransaction(tx: Transaction): Transaction {
    return { ...tx, category: this.getTransactionCategory(tx.id), budgetId: this.budgetMap().get(tx.id) };
  }

  protected setTransactionCategory(id: string, category: CategoryType) {
    const map = new Map(this.categoryMap());
    map.set(id, category);
    this.categoryMap.set(map);
  }

  protected onCategoryApplied(event: CategoryAppliedEvent): void {
    const mapCat = new Map(this.categoryMap());
    const mapAcc = new Map(this.acceptedMap());

    event.updatedTransactions.forEach(tx => {
      mapCat.set(tx.id, tx.category);
      mapAcc.set(tx.id, true);
    });

    this.categoryMap.set(mapCat);
    this.acceptedMap.set(mapAcc);
  }

  protected onBudgetApplied(event: { transactionId: string; budgetId: string | undefined }): void {
    this.setTransactionBudgetId(event.transactionId, event.budgetId ?? '');
  }

  protected isAssistantSuggestedCategory(id: string): boolean {
    const suggested = this.mlSuggestedCategoryMap().get(id);
    return !!suggested && suggested !== 'Others' && this.getTransactionCategory(id) === suggested;
  }

  protected getTransactionBudgetId(id: string): string {
    return this.budgetMap().get(id) ?? '';
  }

  protected setTransactionBudgetId(id: string, budgetId: string) {
    const map = new Map(this.budgetMap());
    map.set(id, budgetId || undefined);
    this.budgetMap.set(map);
  }

  protected isAccepted(id: string): boolean {
    return this.acceptedMap().get(id) ?? false;
  }

  protected get acceptedIdsSet(): ReadonlySet<string> {
    const accepted = new Set<string>();
    this.acceptedMap().forEach((val, id) => {
      if (val) accepted.add(id);
    });
    return accepted;
  }

  protected toggleSelection(id: string | Event | boolean, eventOrBool?: Event | boolean) {
    const map = new Map(this.acceptedMap());
    if (typeof id === 'string' && eventOrBool === undefined) {

      const current = map.get(id) ?? false;
      map.set(id, !current);
    } else {

      const theId = typeof id === 'string' ? id : '';
      const accepted = typeof eventOrBool === 'boolean' ? eventOrBool : ((eventOrBool as any)?.target as HTMLInputElement)?.checked;
      map.set(theId, accepted);
    }
    this.acceptedMap.set(map);
  }

  protected isAllSelected(): boolean {
    if (this.transactions.length === 0) return false;
    return this.transactions.every(t => this.isAccepted(t.id));
  }

  protected isSomeSelected(): boolean {
    const acceptedCount = this.transactions.filter(t => this.isAccepted(t.id)).length;
    return acceptedCount > 0 && acceptedCount < this.transactions.length;
  }

  protected toggleAll(eventOrBool: Event | boolean) {
    const accepted = typeof eventOrBool === 'boolean' ? eventOrBool : (eventOrBool.target as HTMLInputElement).checked;
    const map = new Map(this.acceptedMap());
    this.transactions.forEach(t => map.set(t.id, accepted));
    this.acceptedMap.set(map);
  }

  protected onConfirm() {
    const result = this.transactions.map(tx => ({
      ...tx,
      category: this.getTransactionCategory(tx.id),
      pendingReview: !this.isAccepted(tx.id),
      accepted: this.isAccepted(tx.id),
      budgetId: this.getTransactionBudgetId(tx.id) || undefined
    }));
    this.confirm.emit(result);
    this.resolved.emit(result as Transaction[]);
    this.closeDialog();
  }

  protected onCancel() {
    this.cancel.emit();
    this.closeDialog();
  }
}
