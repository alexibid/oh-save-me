import { RxJsonSchema } from 'rxdb';
import { Unit } from '@domain/models/unit';

export interface RxUnitDocument extends Unit {
  deleted?: boolean;
}

export const UNIT_SCHEMA: RxJsonSchema<RxUnitDocument> = {
  title: 'unit schema',
  description: 'describes a currency or physical-measure unit, built-in or user-added',
  version: 0,
  primaryKey: 'code',
  type: 'object',
  properties: {
    code: { type: 'string', maxLength: 50 },
    symbol: { type: 'string' },
    category: { type: 'string' },
    label: { type: 'string' },
    custom: { type: 'boolean' },
    deleted: { type: 'boolean' }
  },
  required: ['code', 'symbol', 'category', 'label', 'custom']
};
