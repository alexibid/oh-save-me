export type SmartDataType = 'date' | 'currency' | 'category' | 'icon' | 'text' | 'mutedCaption';

export interface SmartColumnSchema<T> {
  readonly key: string;
  readonly dataType: SmartDataType;
  readonly labelKey: string;
  readonly primary: boolean;
  readonly accessor: (record: T) => unknown;
  readonly searchable?: boolean;
}

export interface RecordListSchema<T> {
  readonly columns: readonly SmartColumnSchema<T>[];
  readonly idAccessor: (record: T) => string;
}
