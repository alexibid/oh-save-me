import { AccountType } from '@domain/models/account';
import { DEFAULT_TEMPLATES, MappingTemplate } from '@domain/data/templates';
import { DetectableField, DetectedMapping } from '@domain/models/column-mapping';
import { MappingRule } from '@domain/models/mapping-rule';
import { ColumnClassifierWeights, COLUMN_CLASSIFIER_CLASSES } from '@domain/models/column-classifier-model';
import { BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS } from '@domain/data/bootstrap-column-classifier-weights';
import { extractColumnFeatures } from './column-classifier-features';
import { predictProbabilities } from './column-classifier-math';
import {
  HEADER_KEYWORDS,
  normalizeHeader,
  headerScore,
  contentLooksLikeDate,
  contentLooksNumeric
} from '../shared/column-shape.utils';

export interface AccountSuggestion {
  name: string;
  type: AccountType;
}

export type { DetectableField, FieldDetection, DetectedMapping } from '@domain/models/column-mapping';
export { computeQualityStats, detectContentInconsistencies, detectSignatureDrift } from './column-classifier-discrepancy';

const NUMERIC_FIELDS: readonly DetectableField[] =
  ['amount', 'debit', 'credit', 'balance', 'availableBalance', 'shares', 'price', 'fee', 'tax'];

const MIN_CLASSIFIER_CONFIDENCE = 0.35;

interface Candidate {
  field: DetectableField;
  columnIndex: number;
  confidence: number;
}

export function buildSignatureKey(headers: readonly string[]): string {
  return headers.map(normalizeHeader).join('|');
}

export function detectColumnMapping(
  headers: readonly string[],
  sampleRows: readonly string[][],
  _accountType: AccountType | undefined,
  learnedRules: readonly MappingRule[] = [],
  classifierWeights: ColumnClassifierWeights = BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS
): DetectedMapping {
  const signatureKey = buildSignatureKey(headers);
  const learnedRule = learnedRules.find(rule => rule.signatureKey === signatureKey);
  if (learnedRule) {
    return learnedRule.mapping;
  }

  const [matchedTemplate] = mostSpecificBankTemplates(headers);
  if (matchedTemplate) {
    return mappingFromTemplate(headers, matchedTemplate);
  }
  return detectByModel(headers, sampleRows, classifierWeights);
}

export function suggestAccountFromSignature(headers: readonly string[]): AccountSuggestion | undefined {
  const matches = mostSpecificBankTemplates(headers);
  if (matches.length !== 1) return undefined;

  const [matched] = matches;
  if (!matched.accountType) return undefined;
  return { name: matched.name, type: matched.accountType };
}

export function suggestAccountCandidates(headers: readonly string[]): readonly AccountSuggestion[] {
  return mostSpecificBankTemplates(headers)
    .filter((template): template is MappingTemplate & { accountType: AccountType } => !!template.accountType)
    .map(template => ({ name: template.name, type: template.accountType }));
}

function templateColumns(template: MappingTemplate): [string | undefined, DetectableField][] {
  return [
    [template.dateCol, 'date'],
    [template.descCol, 'desc'],
    [template.amountCol, 'amount'],
    [template.debitCol, 'debit'],
    [template.creditCol, 'credit'],
    [template.balanceCol, 'balance'],
    [template.sharesCol, 'shares'],
    [template.priceCol, 'price'],
    [template.feeCol, 'fee'],
    [template.taxCol, 'tax'],
    [template.symbolCol, 'symbol'],
    [template.typeCol, 'investmentType'],
    [template.assetNameCol, 'assetName'],
    [template.assetTypeCol, 'assetType']
  ];
}

function resolveColumn(normalizedHeaders: readonly string[], takenColumns: Set<number>, col: string): number {
  const normalizedCol = normalizeHeader(col);
  let idx = normalizedHeaders.findIndex((h, i) => !takenColumns.has(i) && h === normalizedCol);
  if (idx === -1) {
    idx = normalizedHeaders.findIndex((h, i) => !takenColumns.has(i) && h.includes(normalizedCol));
  }
  return idx;
}

function matchingBankTemplates(headers: readonly string[]): MappingTemplate[] {
  const normalizedHeaders = headers.map(normalizeHeader);

  return DEFAULT_TEMPLATES.filter(template => {
    const cols = templateColumns(template)
      .map(([col]) => col)
      .filter((col): col is string => !!col);

    const takenColumns = new Set<number>();
    return cols.every(col => {
      const columnIndex = resolveColumn(normalizedHeaders, takenColumns, col);
      if (columnIndex === -1) return false;
      takenColumns.add(columnIndex);
      return true;
    });
  });
}

function mostSpecificBankTemplates(headers: readonly string[]): MappingTemplate[] {
  const matches = matchingBankTemplates(headers);
  if (matches.length === 0) return [];

  const fieldCount = (t: MappingTemplate) =>
    templateColumns(t).filter(([col]) => !!col).length;
  const maxFields = Math.max(...matches.map(fieldCount));

  return matches.filter(t => fieldCount(t) === maxFields);
}

function optionalTemplateColumns(template: MappingTemplate): [string | undefined, DetectableField][] {
  return [
    [template.availableBalanceCol, 'availableBalance']
  ];
}

function mappingFromTemplate(headers: readonly string[], template: MappingTemplate): DetectedMapping {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping: DetectedMapping = {};
  const takenColumns = new Set<number>();

  for (const [col, field] of [...templateColumns(template), ...optionalTemplateColumns(template)]) {
    if (!col) continue;
    const columnIndex = resolveColumn(normalizedHeaders, takenColumns, col);
    if (columnIndex !== -1) {
      mapping[field] = { columnIndex, confidence: 1 };
      takenColumns.add(columnIndex);
    }
  }
  return mapping;
}

function detectByModel(
  headers: readonly string[],
  sampleRows: readonly string[][],
  weights: ColumnClassifierWeights
): DetectedMapping {
  return resolveGreedyAssignment([
    ...scoreByClassifier(headers, sampleRows, weights),
    ...scoreByHeuristics(headers, sampleRows)
  ]);
}

function scoreByClassifier(
  headers: readonly string[],
  sampleRows: readonly string[][],
  weights: ColumnClassifierWeights
): Candidate[] {
  const candidates: Candidate[] = [];

  headers.forEach((header, columnIndex) => {
    const columnValues = sampleRows.map(row => row[columnIndex] ?? '');
    const features = extractColumnFeatures(header, columnIndex, headers.length, columnValues);
    const probabilities = predictProbabilities(weights, features);

    COLUMN_CLASSIFIER_CLASSES.forEach((cls, classIndex) => {
      if (cls === 'none') return;
      const confidence = probabilities[classIndex];
      if (confidence < MIN_CLASSIFIER_CONFIDENCE) return;
      candidates.push({ field: cls, columnIndex, confidence });
    });
  });

  return candidates;
}

function scoreByHeuristics(headers: readonly string[], sampleRows: readonly string[][]): Candidate[] {
  const fields = Object.keys(HEADER_KEYWORDS) as DetectableField[];
  const candidates: Candidate[] = [];

  headers.forEach((header, columnIndex) => {
    const columnValues = sampleRows.map(row => row[columnIndex] ?? '');
    fields.forEach(field => {
      const hScore = headerScore(header, field);
      if (hScore === 0) return;
      const cScore = contentScore(field, columnValues);
      const confidence = cScore > 0 ? hScore * 0.6 + cScore * 0.4 : hScore * 0.6;
      candidates.push({ field, columnIndex, confidence });
    });
  });

  return candidates;
}

function resolveGreedyAssignment(candidates: readonly Candidate[]): DetectedMapping {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);

  const mapping: DetectedMapping = {};
  const takenColumns = new Set<number>();
  for (const candidate of sorted) {
    if (mapping[candidate.field] || takenColumns.has(candidate.columnIndex)) continue;
    mapping[candidate.field] = { columnIndex: candidate.columnIndex, confidence: candidate.confidence };
    takenColumns.add(candidate.columnIndex);
  }

  return mapping;
}

function contentScore(field: DetectableField, columnValues: readonly string[]): number {
  if (field === 'date') return contentLooksLikeDate(columnValues);
  if (NUMERIC_FIELDS.includes(field)) return contentLooksNumeric(columnValues);
  return 0;
}
