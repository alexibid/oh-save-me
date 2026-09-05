import { Component, inject } from '@angular/core';
import { isReversedDateRange } from '@ibid/utils';

import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { Budget, WALLET_KINDS, WalletKind, isLoanBackedKind } from '@domain/models/budget';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { formatDateLocal } from '@ibid/utils';
import { slugify } from '@ibid/utils';
import { BottomSheetDialogComponent, ButtonComponent, DateInputComponent, FormFieldComponent, SelectComponent, SelectOption } from 'ibid-ui';

export type AllocationWizardMode = 'project' | 'investment';

const APPRECIATION_COLOR = { gain: '#0E9B70', loss: '#C4432B', neutral: 'var(--color-text, #2C2C2A)' } as const;

export interface AllocationWizardDialogData {
  readonly mode?: AllocationWizardMode;
  readonly wallet?: Budget;
}

const WALLET_KIND_LABEL: Record<WalletKind, string> = {
  retirement: 'walletKindRetirement',
  savings_account: 'walletKindSavingsAccount',
  savings_certificate: 'walletKindSavingsCertificate',
  stocks: 'walletKindStocks',
  house: 'walletKindHouse',
  car: 'walletKindCar',
  other: 'walletKindOther'
};

@Component({
  selector: 'ohsaveme-allocation-wizard-dialog',
  standalone: true,
  imports: [FormsModule, FormFieldComponent, ButtonComponent, BottomSheetDialogComponent, DateInputComponent, SelectComponent, ...I18N_SHARED],
  templateUrl: './allocation-wizard-dialog.html',
  styleUrl: './allocation-wizard-dialog.scss',
})
export class AllocationWizardDialogComponent {
  private readonly store = useStore();
  private readonly dialogRef = inject(DialogRef<AllocationWizardDialogComponent>);
  protected readonly i18n = inject(I18nService);
  private readonly data = inject<AllocationWizardDialogData | null>(DIALOG_DATA, { optional: true });

  protected readonly mode: AllocationWizardMode = this.data?.mode ?? 'project';
  private readonly editing = this.data?.wallet;

  protected walletKind: WalletKind = 'retirement';
  protected registerDate = formatDateLocal(new Date());
  protected paidInstalments: number | null = null;
  protected contractedInstalments: number | null = null;
  protected currentValue: number | null = null;
  protected outstandingDebt: number | null = null;
  protected targetProfitPct: number | null = null;
  protected targetPrice: number | null = null;
  protected targetAmount: number | null = null;
  protected targetDate = '';

  constructor() {
    if (this.editing) this.prefillFromWallet(this.editing);
  }

  protected readonly walletKindOptions: SelectOption[] = WALLET_KINDS.map(kind => ({
    value: kind,
    label: this.i18n.translate(WALLET_KIND_LABEL[kind])
  }));

  protected isInvestment(): boolean {
    return this.mode === 'investment';
  }

  protected setWalletKind(value: string): void {
    this.walletKind = value as WalletKind;
    if (!this.isLoanBacked()) {
      this.paidInstalments = null;
      this.contractedInstalments = null;
      this.outstandingDebt = null;
    }
  }

  protected amountLabelKey(): string {
    return this.isLoanBacked() ? 'walletContractedAmountLabel' : 'walletInvestedAmountLabel';
  }

  protected isEditing(): boolean {
    return !!this.editing;
  }

  private prefillFromWallet(wallet: Budget): void {
    this.budgetName = wallet.name;
    this.budgetAmount = wallet.amount;
    this.budgetTotalAmount = wallet.totalAmount;
    this.walletKind = (wallet.kind ?? 'other') as WalletKind;
    this.registerDate = wallet.startDate ?? this.registerDate;
    this.currentValue = wallet.currentValue ?? null;
    this.outstandingDebt = wallet.outstandingDebt ?? null;
    this.paidInstalments = wallet.paidInstalments ?? null;
    this.contractedInstalments = wallet.contractedInstalments ?? null;
    this.targetProfitPct = wallet.targetProfitPct ?? null;
    this.targetPrice = wallet.targetPrice ?? null;
    this.targetAmount = wallet.targetAmount ?? null;
    this.targetDate = wallet.targetDate ?? '';
  }

  protected appreciationPercentFromValue(): number | null {
    const contracted = Number(this.budgetAmount ?? 0);
    if (!contracted || this.currentValue === null) return null;
    return Math.round(((Number(this.currentValue) - contracted) / contracted) * 1000) / 10;
  }

  protected appreciationColor(): string {
    const percent = this.appreciationPercentFromValue() ?? 0;
    if (percent > 0) return APPRECIATION_COLOR.gain;
    if (percent < 0) return APPRECIATION_COLOR.loss;
    return APPRECIATION_COLOR.neutral;
  }

  protected isLoanBacked(): boolean {
    return isLoanBackedKind(this.walletKind);
  }

  private loanStartDate(): string {
    const paid = Number(this.paidInstalments ?? 0);
    const start = new Date();
    start.setMonth(start.getMonth() - paid);
    return formatDateLocal(start);
  }

  protected canSubmitInvestment(): boolean {
    if (!this.budgetName.trim() || !this.budgetAmount || this.budgetAmount <= 0) return false;
    if (!this.isLoanBacked()) return !!this.registerDate;
    if (!isNonNegative(this.paidInstalments) || !this.contractedInstalments || this.contractedInstalments <= 0) return false;
    if (Number(this.paidInstalments) > this.contractedInstalments) return false;
    if (!isNonNegative(this.outstandingDebt)) return false;
    return Number(this.outstandingDebt) <= Number(this.budgetAmount);
  }

  private async submitInvestment(): Promise<void> {
    const wallet: Budget = {
      id: this.editing?.id ?? `budget-wallet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: this.budgetName.trim(),
      type: 'investment',
      amount: Number(this.budgetAmount),
      totalAmount: this.budgetTotalAmount !== undefined ? Number(this.budgetTotalAmount) : undefined,
      kind: this.walletKind,
      startDate: this.isLoanBacked() ? this.loanStartDate() : this.registerDate,
      paidInstalments: this.isLoanBacked() ? Number(this.paidInstalments) : undefined,
      contractedInstalments: this.isLoanBacked() ? Number(this.contractedInstalments) : undefined,
      currentValue: this.currentValue !== null ? Number(this.currentValue) : undefined,
      outstandingDebt: this.isLoanBacked() ? Number(this.outstandingDebt) : undefined,
      appreciationPercent: this.isLoanBacked() ? this.appreciationPercentFromValue() ?? undefined : undefined,
      targetAmount: this.targetAmount !== null ? Number(this.targetAmount) : undefined,
      targetDate: this.targetDate || undefined,
      targetProfitPct: this.targetProfitPct !== null ? Number(this.targetProfitPct) : undefined,
      targetPrice: this.targetPrice !== null ? Number(this.targetPrice) : undefined,
      isClosed: false,
      tags: [slugify(this.budgetName)]
    };

    if (this.editing) {
      await this.store.updateBudget(wallet);
    } else {
      await this.store.addBudget(wallet);
    }
    this.dialogRef.close();
  }

  budgetName = '';
  budgetAmount: number | null = null;
  budgetTotalAmount: number | undefined = undefined;
  budgetMonthlyAllocation: number | null = null;
  startDate = formatDateLocal(new Date());
  endDate = '';
  projectStartDate = '';
  projectEndDate = '';

  protected vacationWindowReversed(): boolean {
    return this.projectKind === 'vacation'
      && isReversedDateRange(this.projectStartDate, this.projectEndDate);
  }

  protected budgetPeriodReversed(): boolean {
    return isReversedDateRange(this.startDate, this.endDate);
  }
  projectKind: 'vacation' | 'works' | 'equipment' | '' = '';

  projectKindOptions: SelectOption[] = [
    { value: '', label: 'Outro' },
    { value: 'vacation', label: 'Férias' },
    { value: 'works', label: 'Obras' },
    { value: 'equipment', label: 'Equipamentos' }
  ];

  onStartDateChange(dateStr: string): void {
    this.projectStartDate = dateStr;
    if (!this.startDate || this.startDate > dateStr) {
      this.startDate = dateStr;
    }
    if (!this.endDate || this.endDate < dateStr) {
      this.endDate = dateStr;
    }
    this.calculateMonthlyReserve();
  }

  onProjectEndDateChange(dateStr: string): void {
    this.projectEndDate = dateStr;
    if (!this.endDate || this.endDate < dateStr) {
      this.endDate = dateStr;
    }
    this.calculateMonthlyReserve();
  }

  onBudgetStartDateChange(dateStr: string): void {
    this.startDate = dateStr;
    this.calculateMonthlyReserve();
  }

  onBudgetEndDateChange(dateStr: string): void {
    this.endDate = dateStr;
    this.calculateMonthlyReserve();
  }

  setProjectKind(val: string): void {
    this.projectKind = val as 'vacation' | 'works' | 'equipment' | '';
  }

  onAmountChange(amount: number | null): void {
    this.budgetAmount = amount;
    this.calculateMonthlyReserve();
  }

  private calculateMonthlyReserve(): void {
    if (!this.budgetAmount || !this.startDate || !this.endDate) return;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    this.budgetMonthlyAllocation = months > 0 ? Number((this.budgetAmount / months).toFixed(2)) : this.budgetAmount;
  }

  async onSubmitBudget(): Promise<void> {
    if (this.isInvestment()) {
      if (this.canSubmitInvestment()) await this.submitInvestment();
      return;
    }

    if (!this.budgetName || !this.budgetAmount || this.budgetAmount <= 0 || this.vacationWindowReversed() || this.budgetPeriodReversed()) {
      return;
    }

    const newProject: Budget = {
      id: `budget-proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: this.budgetName,
      type: 'project',
      amount: Number(this.budgetAmount),
      totalAmount: this.budgetTotalAmount !== undefined ? Number(this.budgetTotalAmount) : undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      projectStartDate: this.projectKind === 'vacation' ? (this.projectStartDate || undefined) : undefined,
      projectEndDate: this.projectKind === 'vacation' ? (this.projectEndDate || undefined) : undefined,
      isClosed: false,
      monthlyAllocation: this.budgetMonthlyAllocation ? Number(this.budgetMonthlyAllocation) : undefined,
      targetAmount: this.targetAmount !== null ? Number(this.targetAmount) : undefined,
      targetDate: this.targetDate || undefined,
      kind: this.projectKind || undefined,
      tags: [slugify(this.budgetName)]
    };

    await this.store.addBudget(newProject);
    this.dialogRef.close();
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

function isNonNegative(value: number | null): boolean {
  return value !== null && value >= 0;
}
