import { DetectableField } from './column-mapping';

export const COLUMN_CLASSIFIER_CLASSES = [
  'date', 'desc', 'amount', 'debit', 'credit', 'balance', 'availableBalance',
  'shares', 'price', 'fee', 'tax', 'symbol', 'investmentType',
  'assetName', 'assetType', 'none'
] as const;

export type ColumnClassifierClass = typeof COLUMN_CLASSIFIER_CLASSES[number];

export const DETECTABLE_FIELD_CLASSES: readonly DetectableField[] =
  COLUMN_CLASSIFIER_CLASSES.filter((cls): cls is DetectableField => cls !== 'none');

export function classIndexOf(cls: ColumnClassifierClass): number {
  return COLUMN_CLASSIFIER_CLASSES.indexOf(cls);
}

export interface ColumnClassifierWeights {
  readonly matrix: readonly (readonly number[])[];
  readonly featureVersion: number;
  readonly updatedAt: number;
}
