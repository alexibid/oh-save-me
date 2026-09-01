import { Component, EventEmitter, Input, Output, inject, signal, computed, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo, CategoryType } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { CategorySelectComponent } from '@ui/components/molecules/category-select/category-select';
import { MlConfirmationDialogComponent } from '@ui/components/organisms/ml-confirmation-dialog/ml-confirmation-dialog';
import { defaultSimilarityKeyword, matchesSimilarityKeyword } from '@domain/shared/similar-transactions.utils';
import { isTransferCategory } from '@domain/shared/transfer.utils';
import { UnlinkTransferUseCase } from '@application/use-cases/unlink-transfer.use-case';
import { useStore } from '@application/app-store';

export interface CategoryAppliedEvent {
  readonly updatedTransactions: Transaction[];
  readonly keyword: string;
  readonly targetCategory?: CategoryType;
}

export interface BudgetAppliedEvent {
  readonly transactionId: string;
  readonly budgetId: string | undefined;
}

@Component({
  selector: 'ohsaveme-category-recategorize',
  standalone: true,
  imports: [CommonModule, CategorySelectComponent, forwardRef(() => MlConfirmationDialogComponent)],
  template: `
    <ohsaveme-category-select
      [selectedCategory]="displayCategory()"
      [selectedProjectId]="selectedProjectId()"
      [categories]="categories"
      [projects]="activeProjects"
      [selectedProjectName]="selectedProjectName()"
      [assistantSuggested]="assistantSuggested"
      (categoryChange)="onCategorySelectChange($event)"
      (projectChange)="onProjectSelectChange($event)"
      (createCategoryClick)="onCreateCategoryClick()"
    ></ohsaveme-category-select>

    <ohsaveme-ml-confirmation-dialog
      [visible]="showMlDialog()"
      [triggerTransaction]="mlTriggerTransaction"
      [allTransactions]="fullTransactionHistory()"
      [targetCategory]="mlTargetCategory"
      [activeProjects]="activeProjects"
      [categories]="categories"
      (visibleChange)="showMlDialog.set($event)"
      (confirm)="onMlConfirm($event)"
      (cancel)="onMlCancel()"
    ></ohsaveme-ml-confirmation-dialog>
  `
})
export class CategoryRecategorizeComponent {
  private readonly unlinkTransferUseCase = inject(UnlinkTransferUseCase);
  private readonly store = useStore();

  @Input({ required: true }) set transaction(val: Transaction) {
    this._transaction = val;
    this.localCategory.set(null);
    this.hasLocalBudgetOverride = false;
    this.localBudgetId = undefined;
  }
  get transaction(): Transaction {
    return this._transaction;
  }
  private _transaction!: Transaction;

  @Input({ required: true }) allTransactions!: readonly Transaction[];
  @Input({ required: true }) categories!: CategoryInfo[];
  @Input() activeProjects: readonly Budget[] = [];
  @Input() assistantSuggested = false;

  @Output() categoryApplied = new EventEmitter<CategoryAppliedEvent>();
  @Output() budgetApplied = new EventEmitter<BudgetAppliedEvent>();
  @Output() createCategoryClick = new EventEmitter<void>();

  private localBudgetId: string | undefined = undefined;
  private hasLocalBudgetOverride = false;
  protected readonly localCategory = signal<CategoryType | null>(null);

  protected readonly displayCategory = computed<CategoryType>(() => {
    return this.localCategory() ?? this.transaction.category;
  });

  protected selectedProjectId(): string | undefined {
    if (this.hasLocalBudgetOverride) {
      return this.localBudgetId;
    }
    return this.transaction.budgetId;
  }

  protected selectedProjectName(): string | undefined {
    const budgetId = this.selectedProjectId();
    return this.activeProjects.find(project => project.id === budgetId)?.name;
  }

  protected onProjectSelectChange(projectId: string | undefined): void {
    this.localBudgetId = projectId;
    this.hasLocalBudgetOverride = true;
    this.budgetApplied.emit({ transactionId: this.transaction.id, budgetId: projectId });
  }

  protected readonly showMlDialog = signal(false);
  protected mlTriggerTransaction?: Transaction;
  protected mlTargetCategory: CategoryType = 'Others';

  protected readonly fullTransactionHistory = computed<readonly Transaction[]>(() => {
    const passed = this.allTransactions || [];
    const storeTxs = this.store.transactions?.() ?? [];
    if (storeTxs.length === 0) return passed;

    const ids = new Set(passed.map(t => t.id));
    return [...passed, ...storeTxs.filter(t => !ids.has(t.id))];
  });

  protected onCategorySelectChange(newCategory: CategoryType) {
    const previousCategory = this.displayCategory();
    if (previousCategory === newCategory) return;

    this.localCategory.set(newCategory);
    this.mlTriggerTransaction = this.transaction;
    this.mlTargetCategory = newCategory;
    this.showMlDialog.set(true);
  }

  protected onMlConfirm(event: CategoryAppliedEvent) {
    this.showMlDialog.set(false);
    const trigger = this.buildUpdatedTrigger(this.mlTargetCategory);
    this.categoryApplied.emit({
      updatedTransactions: [trigger, ...event.updatedTransactions],
      keyword: event.keyword,
      targetCategory: this.mlTargetCategory
    });
    this.mlTriggerTransaction = undefined;
  }

  protected onMlCancel() {
    this.showMlDialog.set(false);
    if (this.mlTriggerTransaction) {
      const trigger = this.buildUpdatedTrigger(this.mlTargetCategory);
      this.categoryApplied.emit({
        updatedTransactions: [trigger],
        keyword: '',
        targetCategory: this.mlTargetCategory
      });
    }
    this.mlTriggerTransaction = undefined;
  }

  private buildUpdatedTrigger(newCategory: CategoryType): Transaction {
    const liveTx = this.store.transactions?.()?.find((t: Transaction) => t.id === this.transaction.id) ?? this.transaction;
    const budgetId = this.hasLocalBudgetOverride ? this.localBudgetId : (liveTx.budgetId ?? this.transaction.budgetId);

    if (!isTransferCategory(newCategory) && (liveTx.linkedTransactionId || this.transaction.linkedTransactionId)) {
      this.unlinkTransferUseCase.execute(this.transaction.id);
      const { linkedTransactionId, transferAccountId, ...rest } = liveTx;
      return { ...rest, category: newCategory, budgetId };
    }
    return { ...liveTx, category: newCategory, budgetId };
  }

  protected onCreateCategoryClick() {
    this.createCategoryClick.emit();
  }
}
