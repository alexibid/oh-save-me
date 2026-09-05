import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { Budget } from '@domain/models/budget';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { ShareAccessManagerComponent } from '@ui/components/organisms/share-access-manager/share-access-manager';
import { isReversedDateRange } from '@ibid/utils';
import { slugify } from '@ibid/utils';
import { BottomSheetDialogComponent, DateInputComponent, FormFieldComponent, SegmentOption, SegmentedControlComponent } from 'ibid-ui';

export interface AllocationEditDialogData {
  budget: Budget;
}

@Component({
  selector: 'ohsaveme-allocation-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    BottomSheetDialogComponent,
    FormFieldComponent,
    DateInputComponent,
    ShareAccessManagerComponent,
    SegmentedControlComponent,
    ...I18N_SHARED
],
  templateUrl: './allocation-edit-dialog.html',
  styleUrl: './allocation-edit-dialog.scss'
})
export class AllocationEditDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly store = useStore();
  protected readonly dialogRef = inject<DialogRef<Budget | undefined>>(DialogRef);
  protected readonly data = inject<AllocationEditDialogData>(DIALOG_DATA);

  protected get budget(): Budget {
    return this.data.budget;
  }

  protected budgetName = this.data.budget.name;
  protected budgetAmount = this.data.budget.amount;
  protected budgetMonthlyAllocation = this.data.budget.monthlyAllocation || 0;
  protected budgetStartDate = this.data.budget.startDate || '';
  protected budgetEndDate = this.data.budget.endDate || '';
  protected vacationStartDate = this.data.budget.projectStartDate || '';
  protected vacationEndDate = this.data.budget.projectEndDate || '';
  protected projectTag = this.data.budget.tags?.[0] || slugify(this.data.budget.name);
  protected budgetScope: 'individual' | 'joint' = this.data.budget.scope || (this.data.budget.tags?.includes('joint') ? 'joint' : 'individual');
  protected budgetSharedEmails: readonly string[] = ['shared@example.com'];

  protected readonly scopeOptions: SegmentOption[] = [
    { value: 'individual', label: this.i18n.translate('accountScopeIndividual') },
    { value: 'joint', label: this.i18n.translate('accountScopeJoint') }
  ];

  protected onScopeChange(val: string): void {
    this.budgetScope = val as 'individual' | 'joint';
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected async onSave(): Promise<void> {
    if (this.vacationWindowReversed() || this.budgetPeriodReversed()) return;

    const baseTag = this.data.budget.tags?.find(t => t !== 'joint') || slugify(this.budgetName);
    const tags = this.budgetScope === 'joint' ? [baseTag, 'joint'] : [baseTag];

    const updatedBudget: Budget = {
      ...this.data.budget,
      name: this.budgetName,
      amount: Number(this.budgetAmount),
      scope: this.budgetScope,
      monthlyAllocation: Number(this.budgetMonthlyAllocation) || undefined,
      tags,
      startDate: this.budgetStartDate || undefined,
      endDate: this.budgetEndDate || undefined,
      projectStartDate: this.budget.kind === 'vacation' ? (this.vacationStartDate || undefined) : undefined,
      projectEndDate: this.budget.kind === 'vacation' ? (this.vacationEndDate || undefined) : undefined
    };

    await this.store.updateBudget(updatedBudget);
    if (this.vacationWindowChanged()) {
      await this.store.syncVacationWindow(updatedBudget);
    }
    this.dialogRef.close(updatedBudget);
  }

  protected vacationWindowReversed(): boolean {
    return this.budget.kind === 'vacation'
      && isReversedDateRange(this.vacationStartDate, this.vacationEndDate);
  }

  protected budgetPeriodReversed(): boolean {
    return isReversedDateRange(this.budgetStartDate, this.budgetEndDate);
  }

  private vacationWindowChanged(): boolean {
    if (this.budget.kind !== 'vacation') return false;

    return this.vacationStartDate !== (this.data.budget.projectStartDate || '')
      || this.vacationEndDate !== (this.data.budget.projectEndDate || '');
  }
}
