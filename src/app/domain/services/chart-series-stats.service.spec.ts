import { computeChartSeriesStats } from './chart-series-stats.service';
import { ChartSeries } from '@domain/models/chart-series';

describe('computeChartSeriesStats', () => {
  const series: ChartSeries = {
    name: 'saldo',
    color: 'var(--color-amber-mid)',
    type: 'line',
    points: [
      { label: 'jan', value: 380 },
      { label: 'fev', value: 420 },
      { label: 'mar', value: 510 },
      { label: 'abr', value: 340 },
      { label: 'mai', value: 460 },
      { label: 'jun', value: 430 }
    ]
  };

  it('identifies the first point', () => {
    expect(computeChartSeriesStats(series).first).toEqual({ label: 'jan', value: 380 });
  });

  it('identifies the last point', () => {
    expect(computeChartSeriesStats(series).last).toEqual({ label: 'jun', value: 430 });
  });

  it('identifies the highest point', () => {
    expect(computeChartSeriesStats(series).max).toEqual({ label: 'mar', value: 510 });
  });

  it('identifies the lowest point', () => {
    expect(computeChartSeriesStats(series).min).toEqual({ label: 'abr', value: 340 });
  });

  it('throws for an empty series', () => {
    const empty: ChartSeries = { name: 'saldo', color: '#000', type: 'line', points: [] };
    expect(() => computeChartSeriesStats(empty)).toThrow();
  });

  it('returns the same point as first, last, max and min for a single-point series', () => {
    const single: ChartSeries = { name: 'saldo', color: '#000', type: 'line', points: [{ label: 'jan', value: 100 }] };
    const stats = computeChartSeriesStats(single);
    expect(stats.first).toEqual(stats.last);
    expect(stats.max).toEqual(stats.min);
  });

  it('picks the first occurrence when multiple points tie for the highest value', () => {
    const tied: ChartSeries = {
      name: 'saldo',
      color: '#000',
      type: 'line',
      points: [
        { label: 'jan', value: 100 },
        { label: 'fev', value: 200 },
        { label: 'mar', value: 200 }
      ]
    };
    expect(computeChartSeriesStats(tied).max).toEqual({ label: 'fev', value: 200 });
  });
});
