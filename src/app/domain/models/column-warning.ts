import { DetectableField } from './column-mapping';

export type ColumnWarningKind = 'inconsistent-content' | 'signature-drift';

export interface ColumnWarning {
  readonly kind: ColumnWarningKind;
  readonly field: DetectableField;
  readonly columnIndex: number;
  readonly detail: Readonly<Record<string, number>>;
}
