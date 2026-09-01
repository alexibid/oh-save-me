import { DetectableField, DetectedMapping, FieldDetection } from '@domain/models/column-mapping';
import { ColumnWarning } from '@domain/models/column-warning';
import { QualityStats } from '@domain/models/column-quality-stats';
import { contentLooksLikeDate, contentLooksNumeric } from '@domain/shared/column-shape.utils';

const CONTENT_CONSISTENCY_THRESHOLD = 0.9;
const DRIFT_THRESHOLD = 0.25;

const NUMERIC_FIELDS: readonly DetectableField[] =
  ['amount', 'debit', 'credit', 'balance', 'availableBalance', 'shares', 'price', 'fee', 'tax'];

export function computeQualityStats(mapping: DetectedMapping, sampleRows: readonly string[][]): QualityStats {
  const dateParseRate = mapping.date
    ? contentLooksLikeDate(columnValuesFor(mapping.date.columnIndex, sampleRows))
    : undefined;

  const numericDetections = findNumericDetections(mapping).map(entry => entry.detection);
  const numericParseRate = numericDetections.length > 0
    ? average(numericDetections.map(detection => contentLooksNumeric(columnValuesFor(detection.columnIndex, sampleRows))))
    : undefined;

  return {
    dateParseRate,
    numericParseRate,
    sampleSize: sampleRows.length,
    capturedAt: Date.now()
  };
}

export function detectContentInconsistencies(
  mapping: DetectedMapping,
  sampleRows: readonly string[][]
): readonly ColumnWarning[] {
  const warnings: ColumnWarning[] = [];

  if (mapping.date) {
    const rate = contentLooksLikeDate(columnValuesFor(mapping.date.columnIndex, sampleRows));
    if (rate < CONTENT_CONSISTENCY_THRESHOLD) {
      warnings.push(inconsistencyWarning('date', mapping.date.columnIndex, rate));
    }
  }

  findNumericDetections(mapping).forEach(({ field, detection }) => {
    const rate = contentLooksNumeric(columnValuesFor(detection.columnIndex, sampleRows));
    if (rate < CONTENT_CONSISTENCY_THRESHOLD) {
      warnings.push(inconsistencyWarning(field, detection.columnIndex, rate));
    }
  });

  return warnings;
}

export function detectSignatureDrift(
  mapping: DetectedMapping,
  sampleRows: readonly string[][],
  baseline: QualityStats | undefined
): readonly ColumnWarning[] {
  if (!baseline) return [];

  const current = computeQualityStats(mapping, sampleRows);
  const warnings: ColumnWarning[] = [];

  if (mapping.date && baseline.dateParseRate !== undefined && current.dateParseRate !== undefined) {
    const delta = Math.abs(current.dateParseRate - baseline.dateParseRate);
    if (delta > DRIFT_THRESHOLD) {
      warnings.push(driftWarning('date', mapping.date.columnIndex, baseline.dateParseRate, current.dateParseRate));
    }
  }

  const [firstNumeric] = findNumericDetections(mapping);
  if (firstNumeric && baseline.numericParseRate !== undefined && current.numericParseRate !== undefined) {
    const delta = Math.abs(current.numericParseRate - baseline.numericParseRate);
    if (delta > DRIFT_THRESHOLD) {
      warnings.push(driftWarning(
        firstNumeric.field,
        firstNumeric.detection.columnIndex,
        baseline.numericParseRate,
        current.numericParseRate
      ));
    }
  }

  return warnings;
}

function findNumericDetections(
  mapping: DetectedMapping
): readonly { field: DetectableField; detection: FieldDetection }[] {
  return NUMERIC_FIELDS
    .map(field => ({ field, detection: mapping[field] }))
    .filter((entry): entry is { field: DetectableField; detection: FieldDetection } => !!entry.detection);
}

function columnValuesFor(columnIndex: number, sampleRows: readonly string[][]): readonly string[] {
  return sampleRows.map(row => row[columnIndex] ?? '');
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inconsistencyWarning(field: DetectableField, columnIndex: number, rate: number): ColumnWarning {
  return {
    kind: 'inconsistent-content',
    field,
    columnIndex,
    detail: { parseRate: rate, threshold: CONTENT_CONSISTENCY_THRESHOLD }
  };
}

function driftWarning(
  field: DetectableField,
  columnIndex: number,
  previousRate: number,
  currentRate: number
): ColumnWarning {
  return {
    kind: 'signature-drift',
    field,
    columnIndex,
    detail: { previousRate, currentRate }
  };
}
