import { ChartPoint, ChartSeries } from '@domain/models/chart-series';

export interface ChartSeriesStats {
  readonly first: ChartPoint;
  readonly last: ChartPoint;
  readonly max: ChartPoint;
  readonly min: ChartPoint;
}

export function computeChartSeriesStats(series: ChartSeries): ChartSeriesStats {
  const points = series.points;
  if (points.length === 0) {
    throw new Error('Cannot compute stats for an empty chart series');
  }

  const first = points[0];
  const last = points[points.length - 1];
  const max = points.reduce((highest, point) => (point.value > highest.value ? point : highest), first);
  const min = points.reduce((lowest, point) => (point.value < lowest.value ? point : lowest), first);

  return { first, last, max, min };
}
