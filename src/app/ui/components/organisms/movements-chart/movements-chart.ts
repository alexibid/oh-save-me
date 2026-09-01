import { Component, computed, input, inject } from '@angular/core';
import { Transaction } from '@domain/models/transaction';
import { Account } from '@domain/models/account';
import { buildMovementsBalanceSeries } from '@domain/shared/movements-chart.utils';
import { buildMovementsChartSeries } from './movements-chart-config';
import { I18nService, I18N_SHARED } from '@ui/shared/i18n-shared';
import { ChartSeries } from '@domain/models/chart-series';
import { ChartComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-movements-chart',
  standalone: true,
  imports: [...I18N_SHARED, ChartComponent],
  templateUrl: './movements-chart.html',
  styleUrl: './movements-chart.scss'
})
export class MovementsChartComponent {
  private readonly i18n = inject(I18nService);

  readonly transactions = input.required<readonly Transaction[]>();
  readonly accounts = input<readonly Account[]>([]);
  readonly windowStart = input<string>('');
  readonly asOfDate = input.required<string>();
  readonly fullBleedMobile = input(false);

  private readonly points = computed(() =>
    buildMovementsBalanceSeries(this.transactions(), this.accounts(), {
      start: this.windowStart(),
      end: this.asOfDate()
    })
  );

  readonly chartSeries = computed<readonly ChartSeries[]>(() => {
    return buildMovementsChartSeries(
      this.points(),
      { income: 'receita', expenses: 'despesa', balance: 'saldo' },
      (date) => this.i18n.formatDate(date),
      (val) => this.i18n.formatCurrency(val)
    );
  });
}
