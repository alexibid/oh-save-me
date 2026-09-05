import { Component, input } from '@angular/core';

import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { CardComponent, CurrencyDisplayComponent, CurrencyExplanationRow } from 'ibid-ui';

export type BalanceSummaryMode = 'budget' | 'portfolio';

@Component({
  selector: 'ohsaveme-balance-summary-card',
  standalone: true,
  imports: [CurrencyDisplayComponent, CardComponent, ...I18N_SHARED],
  templateUrl: './balance-summary-card.html',
  styleUrl: './balance-summary-card.scss'
})
export class BalanceSummaryCard {
  readonly mode = input<BalanceSummaryMode>('budget');

  readonly freeBalance = input<number>(0);
  readonly totalWalletBalance = input.required<number>();
  readonly totalWalletBalanceExplanation = input<readonly CurrencyExplanationRow[]>([]);
  readonly activeProjectReserve = input<number>(0);
  readonly categoryRemainingReserve = input<number>(0);
  readonly categoryBudgetedTotal = input<number>(0);
  readonly categoryOverspendTotal = input<number>(0);
  readonly categorySpentWithinBudget = input<number>(0);

  readonly investedValue = input<number>(0);
  readonly assetsValue = input<number>(0);
  readonly totalPatrimony = input<number>(0);
  readonly realizedResult = input<number>(0);

  protected isPortfolio(): boolean {
    return this.mode() === 'portfolio';
  }

  protected headlineValue(): number {
    return this.isPortfolio() ? this.totalPatrimony() : this.freeBalance();
  }
}
