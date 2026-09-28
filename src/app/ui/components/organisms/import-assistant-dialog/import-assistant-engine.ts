import { DetectableField, DetectedMapping, FieldDetection } from '@domain/models/column-mapping';
import { ColumnMapping } from '@application/csv-parser.service';
import { Transaction } from '@domain/models/transaction';
import { computeChronologicalBalances } from '@domain/shared/balance-chain-order.utils';
import { ColumnRole } from '@domain/models/column-role';

export const CONFIDENCE_THRESHOLD = 0.6;

export function isRequiredFieldSatisfied(field: string, mappingArr: readonly string[]): boolean {
  if (field === 'amount') {
    return mappingArr.includes('amount') || mappingArr.includes('debit') || mappingArr.includes('credit');
  }
  if (field === 'credit') {
    return mappingArr.includes('credit') || mappingArr.includes('amount');
  }
  return mappingArr.includes(field);
}

export function isDetectionConfident(detection?: FieldDetection): boolean {
  return !!detection && detection.confidence >= CONFIDENCE_THRESHOLD;
}

export function isFieldConfidentlyDetected(field: string, mapping: DetectedMapping): boolean {
  if (field === 'amount') {
    return isDetectionConfident(mapping.amount)
      || isDetectionConfident(mapping.debit)
      || isDetectionConfident(mapping.credit);
  }
  return isDetectionConfident(mapping[field as DetectableField]);
}

export function mappingToColumnRoles(headerCount: number, mapping: DetectedMapping): ColumnRole[] {
  const roles: ColumnRole[] = new Array(headerCount).fill('skip');
  (Object.keys(mapping) as DetectableField[]).forEach(field => {
    const detection = mapping[field];
    if (detection) roles[detection.columnIndex] = field as ColumnRole;
  });
  return roles;
}

export function columnRolesToMapping(roles: readonly ColumnRole[]): DetectedMapping {
  const mapping: DetectedMapping = {};
  roles.forEach((role, columnIndex) => {
    if (role === 'skip') return;
    mapping[role as DetectableField] = { columnIndex, confidence: 1 };
  });
  return mapping;
}

export function buildColumnMappingObject(mappingArr: readonly ColumnRole[]): ColumnMapping {
  const dateIdx = mappingArr.indexOf('date');
  const descIdx = mappingArr.indexOf('desc');
  const amountIdx = mappingArr.indexOf('amount');
  const debitIdx = mappingArr.indexOf('debit');
  const creditIdx = mappingArr.indexOf('credit');
  const balanceIdx = mappingArr.indexOf('balance');
  const sharesIdx = mappingArr.indexOf('shares');
  const priceIdx = mappingArr.indexOf('price');
  const feeIdx = mappingArr.indexOf('fee');
  const taxIdx = mappingArr.indexOf('tax');
  const symbolIdx = mappingArr.indexOf('symbol');
  const typeIdx = mappingArr.indexOf('investmentType');
  const assetNameIdx = mappingArr.indexOf('assetName');
  const assetTypeIdx = mappingArr.indexOf('assetType');

  return {
    dateIdx: dateIdx >= 0 ? dateIdx : 0,
    descIdx: descIdx >= 0 ? descIdx : 2,
    amountIdx,
    ...(debitIdx >= 0 ? { debitIdx } : {}),
    ...(creditIdx >= 0 ? { creditIdx } : {}),
    ...(balanceIdx >= 0 ? { balanceIdx } : {}),
    ...(sharesIdx >= 0 ? { sharesIdx } : {}),
    ...(priceIdx >= 0 ? { priceIdx } : {}),
    ...(feeIdx >= 0 ? { feeIdx } : {}),
    ...(taxIdx >= 0 ? { taxIdx } : {}),
    ...(symbolIdx >= 0 ? { symbolIdx } : {}),
    ...(typeIdx >= 0 ? { typeIdx } : {}),
    ...(assetNameIdx >= 0 ? { assetNameIdx } : {}),
    ...(assetTypeIdx >= 0 ? { assetTypeIdx } : {})
  };
}

export function calculateAnchoredBalances(
  existingForAccount: readonly Transaction[],
  uniqueTxs: readonly Transaction[],
  anchorBalance: number
): { recalculated: readonly Transaction[]; openingBalance: number } {
  const combined = [...existingForAccount, ...uniqueTxs];
  const totalAmount = combined.reduce((sum, t) => sum + t.amount, 0);
  const openingBalance = Math.round((anchorBalance - totalAmount) * 100) / 100;
  const recalculated = computeChronologicalBalances(combined, openingBalance);

  return { recalculated, openingBalance };
}
