import { describe, it, expect } from 'vitest';
import {
  serializeIngestedTransactionsToCsv,
  buildImportBatchFileName
} from './ingested-csv.utils';
import {
  MOCK_INGESTED_ACCOUNTS,
  MOCK_INGESTED_CATEGORIES,
  MOCK_INGESTED_BUDGETS,
  MOCK_INGESTED_TRANSACTIONS
} from '../../../mocks/ingested-csv.mock';

describe('ingested-csv.utils', () => {
  it('should generate canonical CSV with resolved human-readable names and escaped quotes', () => {
    const csv = serializeIngestedTransactionsToCsv(MOCK_INGESTED_TRANSACTIONS, {
      accounts: MOCK_INGESTED_ACCOUNTS,
      categories: MOCK_INGESTED_CATEGORIES,
      budgets: MOCK_INGESTED_BUDGETS
    });

    const lines = csv.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('Date,Description,Amount,Type,Account,Category,Budget,Notes,IsInternalTransfer,TransactionId');

    expect(lines[1]).toContain('2026-08-15');
    expect(lines[1]).toContain('"COMPRA PINGO DOCE GAIA, PT"');
    expect(lines[1]).toContain('-45.80');
    expect(lines[1]).toContain('expense');
    expect(lines[1]).toContain('CGD Conta Ordem');
    expect(lines[1]).toContain('Supermercado & Alimentação');
    expect(lines[1]).toContain('Férias Algarve');
    expect(lines[1]).toContain('Jantar de amigos');
    expect(lines[1]).toContain('false');
    expect(lines[1]).toContain('tx_1');

    expect(lines[2]).toContain('2026-08-20');
    expect(lines[2]).toContain('2150.00');
    expect(lines[2]).toContain('income');
    expect(lines[2]).toContain('Salário & Vencimento');
  });

  it('should handle empty transactions array gracefully', () => {
    const csv = serializeIngestedTransactionsToCsv([], {
      accounts: [],
      categories: [],
      budgets: []
    });
    expect(csv).toBe('Date,Description,Amount,Type,Account,Category,Budget,Notes,IsInternalTransfer,TransactionId');
  });

  it('should generate formatted file name from batch metadata', () => {
    const fileName = buildImportBatchFileName('extrato_agosto.csv', 'CGD Ordem', new Date('2026-08-30T15:30:00.000Z'));
    expect(fileName).toBe('2026-08-30_1530_CGD_Ordem_extrato_agosto.csv');
  });
});
