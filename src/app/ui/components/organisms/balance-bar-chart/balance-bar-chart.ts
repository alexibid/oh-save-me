import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartPoint, ChartSeries } from '@domain/models/chart-series';
import { BarChartComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-balance-bar-chart',
  standalone: true,
  imports: [CommonModule, BarChartComponent],
  templateUrl: './balance-bar-chart.html',
  styleUrl: './balance-bar-chart.scss'
})
export class BalanceBarChart {
  readonly points = input.required<readonly ChartPoint[]>();
  readonly seriesName = input<string>('');
  readonly seriesColor = input<string>('var(--color-teal-mid, #10b981)');
  readonly caption = input<string>('');
  readonly emptyMessage = input<string>('');

  protected readonly hasData = computed<boolean>(() => this.points().length > 0);

  protected readonly series = computed<readonly ChartSeries[]>(() => [
    {
      name: this.seriesName(),
      color: this.seriesColor(),
      type: 'bar',
      points: this.points()
    }
  ]);
}
