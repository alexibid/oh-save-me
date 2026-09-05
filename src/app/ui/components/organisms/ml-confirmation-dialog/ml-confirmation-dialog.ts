import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges, inject, ViewChild, TemplateRef, signal, computed, forwardRef } from '@angular/core';

import { Dialog, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo, CategoryType } from '@domain/models/category';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { defaultSimilarityKeyword, matchesSimilarityKeyword } from '@domain/shared/similar-transactions.utils';
import { Budget } from '@domain/models/budget';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { BottomSheetDialogComponent, SmartBudgetCellComponent } from 'ibid-ui';

export type MlSortField = 'date' | 'description' | 'category' | 'amount';

@Component({
  selector: 'ohsaveme-ml-confirmation-dialog',
  standalone: true,
  imports: [
    DialogModule,
    BottomSheetDialogComponent,
    SmartBudgetCellComponent,
    forwardRef(() => TransactionsTableComponent),
    ...I18N_SHARED
],
  template: `
    <ng-template #dialogTemplate>
      <ibid-bottom-sheet-dialog class="o-ml-confirmation-dialog" (closeClicked)="onCancel()">
        <span sheet-title>{{ 'mlRuleTitle' | translate }}</span>

        <div class="o-ml-confirmation-dialog__content">
          <p class="o-ml-confirmation-dialog__subtitle">
            {{ 'mlRuleSubtitle' | translate }}
          </p>

          @if (triggerTransaction) {
            <div class="o-ml-confirmation-dialog__keyword-section">
              <span class="o-ml-confirmation-dialog__keyword-label">{{ 'mlKeywordLabel' | translate }}</span>
              <input
                type="text"
                class="a-input o-ml-confirmation-dialog__input"
                [value]="keyword()"
                (input)="onKeywordInput($event)"
                placeholder="Ex: repsol, worten..."
              />
              <span class="o-ml-confirmation-dialog__help-text">
                {{ 'mlRuleHelp' | translate }} <strong>{{ i18n.getCategoryName(targetCategory) }}</strong>.
              </span>
            </div>
          }

          @if (sortedSimilarTransactions().length > 0) {
            <p class="o-ml-confirmation-dialog__subtitle" style="margin-top: 8px; font-weight: 500;">
              {{ 'mlSimilarTxs' | translate }}
            </p>

            <div class="o-ml-confirmation-dialog__list-container">
              <ohsaveme-transactions-table
                [transactions]="sortedSimilarTransactions()"
                [categoryOptions]="categories"
                [selectionMode]="true"
                [selectedIds]="selectedIds()"
                [showActions]="false"
                [showTitle]="false"
                [showTabs]="false"
                [showCategory]="false"
                [metaTemplate]="metaRow"
                (selectionToggle)="toggleSelectionId($event)"
              ></ohsaveme-transactions-table>
            </div>
          } @else {
            <div style="padding: 24px; text-align: center; color: var(--color-text-secondary); border: 1px dashed var(--color-border); border-radius: 8px; font-size: 0.9rem;">
              {{ 'mlNoSimilar' | translate }}
            </div>
          }
        </div>

        <div sheet-footer class="o-ml-confirmation-dialog__actions">
          <button type="button" class="a-button a-button--secondary" (click)="onCancel()">
            {{ 'mlOnlyThisOne' | translate }}
          </button>
          <button type="button" class="a-button a-button--primary" (click)="onConfirm()">
            {{ 'mlConfirmAndApply' | translate }} ({{ selectedCount() }})
          </button>
        </div>
      </ibid-bottom-sheet-dialog>

      <ng-template #metaRow let-tx>
        <ibid-smart-budget-cell
          [categoryId]="targetCategory"
          [categoryName]="i18n.getCategoryName(targetCategory)"
          [categoryColor]="targetCategoryColor()"
          [projectName]="getProjectNameFor(tx)"
        ></ibid-smart-budget-cell>
      </ng-template>
    </ng-template>
  `,
  styleUrl: './ml-confirmation-dialog.scss'
})
export class MlConfirmationDialogComponent implements OnChanges, OnDestroy {
  @ViewChild('dialogTemplate') dialogTemplate?: TemplateRef<unknown>;

  protected readonly i18n = inject(I18nService);
  private readonly dialog = inject(Dialog);
  private dialogRef?: DialogRef<unknown>;

  @Input() visible = false;
  @Input() triggerTransaction?: Transaction;
  @Input() allTransactions: readonly Transaction[] = [];
  @Input() transactions: readonly Transaction[] = [];
  @Input({ required: true }) targetCategory!: CategoryType;
  @Input() activeProjects: readonly Budget[] = [];
  @Input({ required: true }) categories!: CategoryInfo[];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<{ updatedTransactions: Transaction[]; keyword: string }>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly keyword = signal<string>('');
  protected readonly sortField = signal<MlSortField | null>(null);
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly targetCategoryColor = computed(() => {
    return this.categories?.find(c => c.id === this.targetCategory)?.color;
  });

  protected toggleSort(field: MlSortField) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'description' || field === 'category' ? 'asc' : 'desc');
    }
  }

  protected readonly similarTransactions = computed(() => {
    const trigger = this.triggerTransaction;
    if (!trigger) {
      return this.transactions || [];
    }
    const kw = this.keyword();
    if (!kw) return [];

    return this.allTransactions.filter(t => {
      if (t.id === trigger.id) return false;
      if (t.category === this.targetCategory) return false;
      return matchesSimilarityKeyword(t.description, kw);
    });
  });

  protected readonly sortedSimilarTransactions = computed(() => {
    const list = [...this.similarTransactions()];
    const field = this.sortField();
    if (!field) return list;

    const mult = this.sortDirection() === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      if (field === 'date') return mult * a.date.localeCompare(b.date);
      if (field === 'description') return mult * a.description.localeCompare(b.description);
      if (field === 'category') return mult * (a.category || '').localeCompare(b.category || '');
      if (field === 'amount') return mult * (a.amount - b.amount);
      return 0;
    });
  });

  protected getProjectNameFor(tx: Transaction): string | undefined {
    if (tx.budgetId) {
      return this.activeProjects?.find(p => p.id === tx.budgetId)?.name;
    }
    return undefined;
  }

  private openTimeout?: ReturnType<typeof setTimeout>;
  private actionTaken = false;

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
  }

  private initializeState() {
    if (this.triggerTransaction) {
      this.keyword.set(defaultSimilarityKeyword(this.triggerTransaction.description));
    }
    this.selectedIds.set(new Set(this.similarTransactions().map(t => t.id)));
  }

  private openDialog() {
    if (!this.dialogRef && this.dialogTemplate) {
      this.actionTaken = false;
      this.dialogRef = this.dialog.open(this.dialogTemplate, {
        width: '95vw',
        maxWidth: '750px',
        disableClose: true,
        panelClass: 'o-ml-confirmation-dialog-panel'
      });
      this.dialogRef?.closed.subscribe(() => {
        this.dialogRef = undefined;
        this.visibleChange.emit(false);
        if (!this.actionTaken) {
          this.cancelled.emit();
        }
      });
    }
  }

  private closeDialog() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = undefined;
    }
  }

  protected onKeywordInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.keyword.set(val);
    this.selectedIds.set(new Set(this.similarTransactions().map(t => t.id)));
  }

  protected toggleSelectionId(id: string) {
    const set = new Set(this.selectedIds());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.selectedIds.set(set);
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected selectedCount(): number {
    return this.selectedIds().size;
  }

  protected onConfirm() {
    this.actionTaken = true;
    const updatedTransactions: Transaction[] = [];
    const kw = this.keyword();
    const selected = this.selectedIds();

    for (const tx of this.similarTransactions()) {
      if (selected.has(tx.id)) {
        const liveTx = this.allTransactions.find(t => t.id === tx.id) ?? tx;
        updatedTransactions.push({
          ...liveTx,
          category: this.targetCategory,
          budgetId: liveTx.budgetId
        });
      }
    }

    this.confirm.emit({ updatedTransactions, keyword: kw });
    this.closeDialog();
  }

  protected onCancel() {
    this.actionTaken = true;
    this.cancelled.emit();
    this.closeDialog();
  }
}
