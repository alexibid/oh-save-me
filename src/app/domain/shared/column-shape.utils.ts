import { DetectableField } from '@domain/models/column-mapping';
import { parseDate, normalizeAmount } from '@ibid/utils';

export const HEADER_KEYWORDS: Record<DetectableField, string[]> = {
  date: ['data', 'date'],
  desc: ['desc', 'mov', 'det', 'payee'],
  debit: ['debi', 'debit'],
  amount: ['valor', 'mont', 'amount'],
  credit: ['credi'],
  balance: ['saldo', 'balan'],
  availableBalance: ['disponivel', 'available'],
  shares: ['acoes', 'shares', 'qtd'],
  price: ['preco', 'price'],
  fee: ['taxa', 'fee'],
  tax: ['impost', 'tax'],
  symbol: ['simb', 'symbol', 'isin'],
  investmentType: ['type'],
  assetName: ['name'],
  assetType: ['asset_class', 'asset class']
};

export function normalizeHeader(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function headerScore(header: string, field: DetectableField): number {
  const lower = normalizeHeader(header);

  if (field === 'investmentType') {
    return lower === 'type' || (lower.includes('invest') && lower.includes('type')) ? 1 : 0;
  }
  if (field === 'assetName') {
    return lower === 'name' ? 1 : 0;
  }
  return HEADER_KEYWORDS[field].some(kw => lower.includes(kw)) ? 1 : 0;
}

export function contentLooksLikeDate(values: readonly string[]): number {
  const nonEmpty = values.filter(v => v && v.trim());
  if (nonEmpty.length === 0) return 0;
  const matches = nonEmpty.filter(v => parseDate(v) !== null).length;
  return matches / nonEmpty.length;
}

export function contentLooksNumeric(values: readonly string[]): number {
  const nonEmpty = values.filter(v => v && v.trim());
  if (nonEmpty.length === 0) return 0;
  const matches = nonEmpty.filter(v => /^-?[\d.,\s]+$/.test(v.trim()) && normalizeAmount(v) !== 0).length;
  return matches / nonEmpty.length;
}

export function contentLooksLikeInteger(values: readonly string[]): number {
  const nonEmpty = values.filter(v => v && v.trim());
  if (nonEmpty.length === 0) return 0;
  const matches = nonEmpty.filter(v => /^-?\d+$/.test(v.trim())).length;
  return matches / nonEmpty.length;
}

export function contentLooksLikeCode(values: readonly string[]): number {
  const nonEmpty = values.filter(v => v && v.trim());
  if (nonEmpty.length === 0) return 0;
  const matches = nonEmpty.filter(v => /^[A-Z0-9]{4,14}$/.test(v.trim().toUpperCase())).length;
  return matches / nonEmpty.length;
}
