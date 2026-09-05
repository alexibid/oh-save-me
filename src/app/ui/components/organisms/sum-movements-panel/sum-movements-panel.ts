import { Component, EventEmitter, Input, Output, inject } from '@angular/core';

import { Transaction } from '@domain/models/transaction';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { CardComponent, CurrencyDisplayComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-sum-movements-panel',
  standalone: true,
  imports: [CurrencyDisplayComponent, CardComponent, ...I18N_SHARED],
  templateUrl: './sum-movements-panel.html',
  styleUrl: './sum-movements-panel.scss'
})
export class SumMovementsPanelComponent {
  protected readonly i18n = inject(I18nService);

  @Input() enabled = true;
  @Input() selectedTransactions: readonly Transaction[] = [];
  @Input() transactions: readonly Transaction[] = [];
  @Input() excludeTransfers = false;

  @Output() enabledChange = new EventEmitter<boolean>();
  @Output() excludeTransfersChange = new EventEmitter<boolean>();

  protected sortField: 'date' | 'description' | 'category' | 'amount' = 'date';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  onToggle(): void {
    this.enabled = !this.enabled;
    this.enabledChange.emit(this.enabled);
  }

  protected toggleSort(field: 'date' | 'description' | 'category' | 'amount'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  get effectiveTransactions(): readonly Transaction[] {
    const list = this.selectedTransactions.length > 0 ? this.selectedTransactions : this.transactions;
    if (!this.excludeTransfers) {
      return list;
    }
    return list.filter(tx => tx.category !== 'InternalTransfer' && tx.category !== 'TransferenciaInterna');
  }

  get displayTransactions(): readonly Transaction[] {
    const list = [...this.effectiveTransactions];
    return list.sort((a, b) => {
      let comp = 0;
      if (this.sortField === 'date') comp = a.date.localeCompare(b.date);
      else if (this.sortField === 'description') comp = a.description.localeCompare(b.description);
      else if (this.sortField === 'category') comp = a.category.localeCompare(b.category);
      else if (this.sortField === 'amount') comp = a.amount - b.amount;
      return this.sortDirection === 'asc' ? comp : -comp;
    });
  }

  get totalIncome(): number {
    return this.effectiveTransactions
      .filter(tx => tx.amount > 0)
      .reduce((acc, tx) => acc + tx.amount, 0);
  }

  get totalExpense(): number {
    return this.effectiveTransactions
      .filter(tx => tx.amount < 0)
      .reduce((acc, tx) => acc + tx.amount, 0);
  }

  get totalExpenses(): number {
    return this.totalExpense;
  }

  get totalBalance(): number {
    return this.totalIncome + this.totalExpense;
  }

  get netTotal(): number {
    return this.totalBalance;
  }

  onToggleExcludeTransfers(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.excludeTransfersChange.emit(checked);
  }
}
