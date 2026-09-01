export interface ChartPoint {
  readonly label: string;
  readonly value: number;
  readonly displayValue?: string;
}

export interface ChartSeries {
  readonly name: string;
  readonly color: string;
  readonly type: 'line' | 'bar';
  readonly fillArea?: boolean;
  readonly points: readonly ChartPoint[];
}
