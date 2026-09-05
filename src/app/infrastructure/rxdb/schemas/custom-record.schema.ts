import type { RxJsonSchema } from 'rxdb';
import { CustomRecord } from '@domain/models/custom-record';

export interface RxCustomRecordDocument extends CustomRecord {
  deleted?: boolean;
}

export const CUSTOM_RECORD_SCHEMA: RxJsonSchema<RxCustomRecordDocument> = {
  title: 'custom record schema',
  description: 'describes an imported row for a personalized (non-financial) account',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    accountId: { type: 'string', maxLength: 100 },
    date: { type: 'string' },
    dimensions: { type: 'object' },
    measures: { type: 'object' },
    importBatchId: { type: 'string' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' }
  },
  required: ['id', 'accountId', 'date', 'dimensions', 'measures', 'updatedAt'],
  indexes: ['accountId']
};
