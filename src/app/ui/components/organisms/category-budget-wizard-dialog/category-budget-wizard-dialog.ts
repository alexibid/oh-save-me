import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { Budget } from '@domain/models/budget';
import { SuggestedCategoryBudget } from '@domain/shared/budget-suggestion.utils';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { CategoryBudgetBreakdownComponent } from '@ui/components/molecules/category-budget-breakdown/category-budget-breakdown';
import { BudgetSelectors } from '@application/selectors/budget.selectors';

import { ShareAccessManagerComponent } from '@ui/components/organisms/share-access-manager/share-access-manager';
import { BottomSheetDialogComponent, CurrencyDisplayComponent, IconComponent } from 'ibid-ui';

const ZERO_SUGGESTION: SuggestedCategoryBudget = { average: 0, includedMonths: 0, excludedOutlierMonths: 0 };

export interface CategoryBudgetWizardDialogData {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly existingBudget: Budget | null;
}

@Component({
  selector: 'ohsaveme-category-budget-wizard-dialog',
  standalone: true,
  imports: [CurrencyDisplayComponent,
    CommonModule,
    FormsModule,
    DialogModule,
    CategoryBudgetBreakdownComponent,
    IconComponent,
    BottomSheetDialogComponent,
    ShareAccessManagerComponent,
    ...I18N_SHARED
  ],
  templateUrl: './category-budget-wizard-dialog.html',
  styleUrl: './category-budget-wizard-dialog.scss'
})
export class CategoryBudgetWizardDialogComponent {
  protected readonly store = useStore();
  protected readonly i18n = inject(I18nService);
  protected readonly dialogRef = inject<DialogRef<number | undefined>>(DialogRef);
  protected readonly data = inject<CategoryBudgetWizardDialogData>(DIALOG_DATA);

  private readonly budgetSelectors = inject(BudgetSelectors);

  protected readonly currentStep = signal<number>(1);
  protected readonly liveSuggestion = signal<SuggestedCategoryBudget>(ZERO_SUGGESTION);
  protected readonly budgetAmount = signal<number>(0);

  protected readonly existingBudget = computed(() => {
    if (this.data.existingBudget) return this.data.existingBudget;
    const progress = this.budgetSelectors.categoryBudgetProgress(this.data.categoryId);
    return progress?.budget ?? null;
  });

  protected readonly isEditMode = computed(() => !!this.existingBudget());
  protected readonly resolvedCategoryName = computed(() => this.i18n.getCategoryName(this.data.categoryId) || this.data.categoryName);

  constructor() {
    const existing = this.data.existingBudget || this.budgetSelectors.categoryBudgetProgress(this.data.categoryId)?.budget || null;
    if (existing) {
      this.budgetAmount.set(existing.amount);
    }
  }

  protected canSave(): boolean {
    return this.budgetAmount() > 0;
  }

  protected onSuggestionLoaded(suggestion: SuggestedCategoryBudget): void {
    this.liveSuggestion.set(suggestion);
    if (!this.isEditMode() && this.budgetAmount() <= 0 && suggestion.average > 0) {
      this.budgetAmount.set(Math.round(suggestion.average));
    }
  }

  protected onContinue(): void {
    if (this.budgetAmount() <= 0 && this.liveSuggestion().average > 0) {
      this.budgetAmount.set(Math.round(this.liveSuggestion().average));
    }
    this.currentStep.set(2);
  }

  protected onBack(): void {
    this.currentStep.set(1);
  }

  protected async onSave(): Promise<void> {
    const val = Number(this.budgetAmount());
    if (val > 0) {
      const existing = this.existingBudget();
      if (existing) {
        const updated = {
          ...existing,
          amount: val,
          updatedAt: new Date().toISOString()
        };
        await this.store.updateBudget(updated);
      } else {
        const newBudget = {
          id: crypto.randomUUID(),
          name: this.data.categoryName || this.i18n.getCategoryName(this.data.categoryId),
          type: 'category' as const,
          categoryId: this.data.categoryId,
          amount: val,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isClosed: false
        };
        await this.store.addBudget(newBudget);
      }
      this.dialogRef.close(val);
    }
  }

  protected async onDelete(): Promise<void> {
    const existing = this.existingBudget();
    if (existing) {
      await this.store.deleteBudget(existing.id);
    }
    this.dialogRef.close(undefined);
  }

  protected onCancel(): void {
    this.dialogRef.close(undefined);
  }
}
