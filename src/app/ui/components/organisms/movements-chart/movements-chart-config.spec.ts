import { buildMovementsChartSeries } from './movements-chart-config';
import { MovementsBalancePoint } from '@domain/shared/movements-chart.utils';

describe('buildMovementsChartSeries', () => {
  const labels = { income: 'Income', expenses: 'Expenses', balance: 'Balance' };
  const formatCurrency = (val: number) => `${val}€`;

  it('maps each point through the given formatter to build the series labels', () => {
    const points: MovementsBalancePoint[] = [
      { date: '2026-06-01', income: 100, expenses: -30, balance: 70 },
      { date: '2026-06-05', income: 0, expenses: -20, balance: 50 }
    ];

    const series = buildMovementsChartSeries(points, labels, date => `formatted(${date})`, formatCurrency);

    expect(series[0].points.map(p => p.label)).toEqual(['formatted(2026-06-01)', 'formatted(2026-06-05)']);
  });

  it('builds a mixed dataset — balance (filled line area), income and expenses (lines without fill)', () => {
    const points: MovementsBalancePoint[] = [{ date: '2026-06-01', income: 100, expenses: -30, balance: 70 }];

    const series = buildMovementsChartSeries(points, labels, date => date, formatCurrency);

    expect(series.length).toBe(3);

    expect(series[0]).toMatchObject({ type: 'line', name: 'Balance', fillArea: true });
    expect(series[0].points[0].value).toBe(70);

    expect(series[1]).toMatchObject({ type: 'line', name: 'Income' });
    expect(series[1].points[0].value).toBe(100);

    expect(series[2]).toMatchObject({ type: 'line', name: 'Expenses' });
    expect(series[2].points[0].value).toBe(30);
  });

  it('returns an empty chart series for an empty points list', () => {
    const series = buildMovementsChartSeries([], labels, date => date, formatCurrency);

    expect(series).toEqual([]);
  });
});
