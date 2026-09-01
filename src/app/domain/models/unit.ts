export type UnitCategory = 'currency' | 'physical_measure';

export interface Unit {
  readonly code: string;
  readonly symbol: string;
  readonly category: UnitCategory;
  readonly label: string;
  readonly custom: boolean;
}

export const BUILTIN_UNITS: readonly Unit[] = [
  { code: 'EUR', symbol: '€', category: 'currency', label: 'Euro', custom: false },
  { code: 'USD', symbol: '$', category: 'currency', label: 'US Dollar', custom: false },
  { code: 'GBP', symbol: '£', category: 'currency', label: 'Pound Sterling', custom: false },
  { code: 'kWh', symbol: 'kWh', category: 'physical_measure', label: 'Kilowatt-hour', custom: false },
  { code: 'L', symbol: 'l', category: 'physical_measure', label: 'Liter', custom: false },
  { code: 'L_100KM', symbol: 'l/100km', category: 'physical_measure', label: 'Liters per 100km', custom: false },
  { code: 'KM', symbol: 'km', category: 'physical_measure', label: 'Kilometer', custom: false },
  { code: 'M3', symbol: 'm³', category: 'physical_measure', label: 'Cubic meter', custom: false }
];
