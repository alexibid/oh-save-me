import { InvestmentType } from '@domain/models/transaction';

export const INVESTMENT_TYPE_MAP: Record<string, InvestmentType> = {
  'BUY': 'buy',
  'SELL': 'sell',
  'DIVIDEND': 'dividend',
  'INTEREST_PAYMENT': 'interest',
  'CUSTOMER_INPAYMENT': 'deposit',
  'TRANSFER_INSTANT_INBOUND': 'deposit',
  'TRANSFER_INBOUND': 'deposit',
  'TRANSFER_INSTANT_OUTBOUND': 'withdrawal',
  'TRANSFER_OUTBOUND': 'withdrawal',
  'TRANSFER_OUTBOUND_SEPA': 'withdrawal',
  'SAVEBACK': 'buy',
  'SAVINGS_PLAN': 'buy',
};

export const REFUND_KEYWORDS = [
  'reembolso', 'devolucao', 'refund', 'estorno', 'reversao', 'credito de'
];

export const SUMMARY_KEYWORDS = [
  'total de',
  'saldo contabilistico',
  'saldo disponivel',
  'saldo anterior',
  'saldo final',
  'totais',
  'resumo',
  'posicao',
  'movimentos da conta',
  'carteira de',
  'saldos'
];

export function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"' && current.length === 0) {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function isSummaryRow(description: string): boolean {
  const lower = description.toLowerCase();
  return SUMMARY_KEYWORDS.some(kw => lower.includes(kw));
}

export function isRefundDescription(description: string): boolean {
  const lower = description.toLowerCase();
  return REFUND_KEYWORDS.some(kw => lower.includes(kw));
}
