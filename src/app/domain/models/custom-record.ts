export interface CustomRecordMeasure {
  readonly value: number;
  readonly unit: string;
}

export interface CustomRecord {
  readonly id: string;
  readonly accountId: string;
  readonly date: string;
  readonly dimensions: Readonly<Record<string, string>>;
  readonly measures: Readonly<Record<string, CustomRecordMeasure>>;
  readonly importBatchId?: string;
  readonly updatedAt: number;
}
