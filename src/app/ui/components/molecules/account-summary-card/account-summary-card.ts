import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { AccountType } from '@domain/models/account';

import { CardComponent, CurrencyDisplayComponent, HandDrawnDirective, IconComponent, ViewMoreLinkComponent } from 'ibid-ui';

const NON_STATUS_PALETTE = ['amber', 'pink', 'purple', 'indigo', 'blue', 'cyan'] as const;

function getDeterministicColor(seed: string, offset = 0): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const color = NON_STATUS_PALETTE[(hash + offset) % NON_STATUS_PALETTE.length];
  return `u-bg-${color}`;
}

@Component({
  selector: 'ohsaveme-account-summary-card',
  standalone: true,
  imports: [CurrencyDisplayComponent, IconComponent, CommonModule, CardComponent, ViewMoreLinkComponent, HandDrawnDirective, ...I18N_SHARED],
  templateUrl: './account-summary-card.html',
  styleUrl: './account-summary-card.scss'
})
export class AccountSummaryCardComponent {
  private _showCaveat = false;

  get cardColorClass(): string {
    return getDeterministicColor(this.accountId || this.accountName || 'acc', 0);
  }

  get childColor1(): string {
    return getDeterministicColor(this.accountId || this.accountName || 'acc', 1);
  }

  get childColor2(): string {
    return getDeterministicColor(this.accountId || this.accountName || 'acc', 2);
  }

  get childColor3(): string {
    return getDeterministicColor(this.accountId || this.accountName || 'acc', 3);
  }
  @Input()
  get showCreditInstallmentCaveat(): boolean {
    return this._showCaveat || this.accountType === 'credit_card';
  }
  set showCreditInstallmentCaveat(val: boolean) {
    this._showCaveat = val;
  }

  @Input() accountId = '';
  @Input() title = '';
  @Input() accountName = '';
  @Input() accountTypeLabel = '';
  @Input() accountType: AccountType = 'bank_account';
  @Input() type: AccountType = 'bank_account';
  @Input() currentBalance = 0;
  @Input() walletBalance = 0;
  @Input() periodCashflow = 0;
  @Input() pendingTriageCount = 0;
  @Input() initialBalance = 0;
  @Input() incomePeriod = 0;
  @Input() expensePeriod = 0;
  @Input() totalIncome = 0;
  @Input() totalExpenses = 0;
  @Input() lastUpdateDate = '';
  @Input() periodStartDate = '';
  @Input() periodEndDate = '';
  @Input() scope: 'individual' | 'joint' = 'individual';
  @Input() isShared = false;

  @Output() editAccount = new EventEmitter<string>();
  @Output() manageSharing = new EventEmitter<string>();

  get isFinancial(): boolean {
    const targetType = this.accountType || this.type;
    return targetType === 'bank_account' || targetType === 'credit_card' || targetType === 'meal_card';
  }

  get computedPeriodBalance(): number {
    return this.incomePeriod + this.expensePeriod;
  }

  get isZeroBalance(): boolean {
    return Math.abs(this.currentBalance || this.walletBalance) < 0.001;
  }

  get netChangePeriod(): number {
    return this.incomePeriod + this.expensePeriod;
  }

  get totalMovementVolume(): number {
    return Math.abs(this.incomePeriod) + Math.abs(this.expensePeriod);
  }

  get flowRatio(): number {
    const total = this.totalMovementVolume;
    if (total === 0) return 50;
    return Math.round((Math.abs(this.incomePeriod) / total) * 100);
  }

  onEditClick(event: MouseEvent): void {
    event.stopPropagation();
    this.editAccount.emit(this.accountId);
  }
}
