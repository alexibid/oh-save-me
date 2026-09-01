import { ChartSeries } from '@domain/models/chart-series';
import { MovementsBalancePoint } from '@domain/shared/movements-chart.utils';

export interface MovementsChartLabels {
  readonly income: string;
  readonly expenses: string;
  readonly balance: string;
}

export function buildMovementsChartSeries(
  points: readonly MovementsBalancePoint[],
  labels: MovementsChartLabels,
  formatPointLabel: (isoDate: string) => string,
  formatCurrency: (value: number) => string
): readonly ChartSeries[] {
  if (points.length === 0) return [];

  return [
    {
      name: labels.balance,
      color: 'var(--color-amber-mid)',
      type: 'line',
      fillArea: true,
      points: points.map(p => ({
        label: formatPointLabel(p.date),
        value: p.balance,
        displayValue: formatCurrency(p.balance)
      }))
    },
    {
      name: labels.income,
      color: 'var(--color-teal-mid)',
      type: 'line',
      points: points.map(p => ({
        label: formatPointLabel(p.date),
        value: p.income,
        displayValue: formatCurrency(p.income)
      }))
    },
    {
      name: labels.expenses,
      color: 'var(--color-coral-mid)',
      type: 'line',
      points: points.map(p => ({
        label: formatPointLabel(p.date),
        value: Math.abs(p.expenses),
        displayValue: formatCurrency(Math.abs(p.expenses))
      }))
    }
  ];
}
