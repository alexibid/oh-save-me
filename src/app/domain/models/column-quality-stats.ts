export interface QualityStats {
  readonly dateParseRate?: number;
  readonly numericParseRate?: number;
  readonly sampleSize: number;
  readonly capturedAt: number;
}
