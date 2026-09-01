import { DETECTABLE_FIELD_CLASSES } from '@domain/models/column-classifier-model';
import {
  headerScore,
  contentLooksLikeDate,
  contentLooksNumeric,
  contentLooksLikeInteger,
  contentLooksLikeCode
} from '../shared/column-shape.utils';

export const COLUMN_FEATURE_NAMES: readonly string[] = [
  'bias',
  ...DETECTABLE_FIELD_CLASSES.map(field => `kw_${field}`),
  'dateParseRate',
  'numericParseRate',
  'integerRate',
  'codeRate',
  'uniqueValueRatio',
  'avgValueLengthNorm',
  'emptyValueRatio',
  'columnPositionRatio'
];

const MAX_AVG_LENGTH = 40;

export function extractColumnFeatures(
  header: string,
  columnIndex: number,
  totalColumns: number,
  columnValues: readonly string[]
): readonly number[] {
  const nonEmpty = columnValues.filter(v => v && v.trim());
  const distinctNonEmpty = new Set(nonEmpty.map(v => v.trim()));
  const avgLength = nonEmpty.length > 0
    ? nonEmpty.reduce((sum, v) => sum + v.trim().length, 0) / nonEmpty.length
    : 0;
  const emptyValueRatio = columnValues.length > 0
    ? (columnValues.length - nonEmpty.length) / columnValues.length
    : 0;
  const uniqueValueRatio = nonEmpty.length > 0 ? distinctNonEmpty.size / nonEmpty.length : 0;
  const columnPositionRatio = totalColumns > 1 ? columnIndex / (totalColumns - 1) : 0;

  return [
    1,
    ...DETECTABLE_FIELD_CLASSES.map(field => headerScore(header, field)),
    contentLooksLikeDate(columnValues),
    contentLooksNumeric(columnValues),
    contentLooksLikeInteger(columnValues),
    contentLooksLikeCode(columnValues),
    uniqueValueRatio,
    Math.min(avgLength / MAX_AVG_LENGTH, 1),
    emptyValueRatio,
    columnPositionRatio
  ];
}
