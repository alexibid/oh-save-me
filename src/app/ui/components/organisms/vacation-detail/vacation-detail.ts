import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges, inject, ViewChild, TemplateRef, computed } from '@angular/core';

import { Dialog, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { useStore } from '@application/app-store';
import { formatDateDisplay, parseLocalDate, formatDateLocal } from '@ibid/utils';
import { Transaction } from '@domain/models/transaction';
import { matchesProjectBudget } from '@domain/shared/project-transaction.utils';
import { TransactionClassificationSelectors } from '@application/selectors/transaction-classification.selectors';
import { BottomSheetDialogComponent, ButtonComponent, CurrencyDisplayComponent } from 'ibid-ui';

export interface DailyBreakdown {
  readonly date: string;
  readonly displayDate: string;
  readonly transactions: Transaction[];
  readonly dayTotal: number;
  readonly cumulativeTotal: number;
}

@Component({
  selector: 'ohsaveme-vacation-detail',
  standalone: true,
  imports: [CurrencyDisplayComponent, DialogModule, BottomSheetDialogComponent, ButtonComponent, ...I18N_SHARED],
  templateUrl: './vacation-detail.html',
  styleUrl: './vacation-detail.scss'
})
export class VacationDetail implements OnChanges, OnDestroy {
  private readonly dialog = inject(Dialog);
  private readonly classifications = inject(TransactionClassificationSelectors);
  protected readonly store = useStore();

  private dialogRef?: DialogRef<unknown>;
  private openTimeout?: ReturnType<typeof setTimeout>;

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) visible = false;
  @Input({ required: true }) budgetId = '';
  @Output() visibleChange = new EventEmitter<boolean>();

  protected readonly budget = computed(() => {
    return this.store.budgets().find(b => b.id === this.budgetId);
  });

  protected readonly dailyBreakdown = computed<DailyBreakdown[]>(() => {
    const b = this.budget();
    if (!b || !b.projectStartDate || !b.projectEndDate) return [];

    const allTx = this.store.transactions();

    const days: string[] = [];
    const curr = parseLocalDate(b.projectStartDate);
    const end = parseLocalDate(b.projectEndDate);
    while (curr <= end) {
      days.push(formatDateLocal(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const isRecurring = this.classifications.isRecurring();
    const atypical = allTx.filter(t => matchesProjectBudget(t, b, this.store.endDate(), isRecurring));

    let runningTotal = 0;
    return days.map((day, idx) => {
      const dayTxs = atypical.filter(t => t.date === day);
      const dayTotal = dayTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      runningTotal += dayTotal;

      return {
        date: day,
        displayDate: `Dia ${idx + 1} - ${formatDateDisplay(day).slice(0, 5)}`,
        transactions: dayTxs,
        dayTotal,
        cumulativeTotal: runningTotal
      };
    });
  });

  protected readonly totalAtypicalSpent = computed(() => {
    const breakdown = this.dailyBreakdown();
    if (breakdown.length === 0) return 0;
    return breakdown[breakdown.length - 1].cumulativeTotal;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        if (this.openTimeout) clearTimeout(this.openTimeout);
        this.openTimeout = setTimeout(() => this.openDialog());
      } else {
        this.closeDialog();
      }
    }
  }

  ngOnDestroy() {
    if (this.openTimeout) clearTimeout(this.openTimeout);
    this.closeDialog();
  }

  private openDialog() {
    if (!this.dialogRef && this.dialogTemplate) {
      this.dialogRef = this.dialog.open(this.dialogTemplate, {
        width: '95vw',
        maxWidth: '500px',
        disableClose: true,
        panelClass: 'o-vacation-detail-panel'
      });
      this.dialogRef?.closed.subscribe(() => {
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

  onClose() {
    this.closeDialog();
  }
}
