import { RxJsonSchema } from 'rxdb';
import { AccountType, AccountScope } from '@domain/models/account';

export interface RxAccountDocument {
  id: string;
  name: string;
  updatedAt: number;
  kind: 'financial' | 'custom';
  type?: AccountType;
  scope?: AccountScope;
  includeInConsolidatedBalance?: boolean;
  unit?: string;
  openingBalance?: number;
  purpose?: string;
  presetId?: string;
  deleted?: boolean;
}

export const ACCOUNT_SCHEMA: RxJsonSchema<RxAccountDocument> = {
  title: 'account schema',
  description: 'describes a financial or custom account',
  version: 4,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    updatedAt: { type: 'number' },
    kind: { type: 'string' },
    type: { type: 'string' },
    scope: { type: 'string' },
    includeInConsolidatedBalance: { type: 'boolean' },
    unit: { type: 'string' },
    openingBalance: { type: 'number' },
    purpose: { type: 'string' },
    presetId: { type: 'string' },
    deleted: { type: 'boolean' }
  },
  required: ['id', 'name', 'updatedAt', 'kind']
};
