import { RxJsonSchema } from 'rxdb';
import { ImportBatch } from '@domain/models/import-batch';

export interface RxImportBatchDocument extends ImportBatch {
  deleted?: boolean;
}

export const IMPORT_BATCH_SCHEMA: RxJsonSchema<RxImportBatchDocument> = {
  title: 'import batch schema',
  description: 'describes an import batch / statement',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    importDate: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    accountId: { type: 'string' },
    transactionCount: { type: 'number' },
    fileChecksum: { type: 'string' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' }
  },
  required: [
    'id',
    'name',
    'importDate',
    'startDate',
    'endDate',
    'accountId',
    'transactionCount',
    'fileChecksum',
    'updatedAt'
  ]
};
