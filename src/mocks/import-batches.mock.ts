import { ImportBatch } from '@domain/models/import-batch';
import { MOCK_ACCOUNT_BANK, MOCK_ACCOUNT_INVESTMENT } from './accounts.mock';

export const MOCK_IMPORT_BATCH_BANK_JULY: ImportBatch = {
  id: 'batch-bank-01',
  name: 'extrato_bancario_julho_2026.csv',
  importDate: '2026-07-28T10:00:00.000Z',
  startDate: '2026-07-01',
  endDate: '2026-07-28',
  accountId: MOCK_ACCOUNT_BANK.id,
  transactionCount: 17,
  fileChecksum: 'sha256-mock-bank-july-checksum',
  updatedAt: 1753700000000
};

export const MOCK_IMPORT_BATCH_INVEST_JULY: ImportBatch = {
  id: 'batch-invest-01',
  name: 'extrato_investimentos_julho_2026.csv',
  importDate: '2026-07-31T18:00:00.000Z',
  startDate: '2026-07-28',
  endDate: '2026-07-31',
  accountId: MOCK_ACCOUNT_INVESTMENT.id,
  transactionCount: 5,
  fileChecksum: 'sha256-mock-invest-july-checksum',
  updatedAt: 1753900000000
};

export const MOCK_IMPORT_BATCHES: readonly ImportBatch[] = [
  MOCK_IMPORT_BATCH_BANK_JULY,
  MOCK_IMPORT_BATCH_INVEST_JULY
];
