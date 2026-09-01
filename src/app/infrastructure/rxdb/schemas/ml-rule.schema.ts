import { RxJsonSchema } from 'rxdb';
import { MlRule } from '@domain/models/ml-rule';

export interface RxMlRuleDocument extends MlRule {
  deleted?: boolean;
}

export const ML_RULE_SCHEMA: RxJsonSchema<RxMlRuleDocument> = {
  title: 'ml rule schema',
  description: 'describes a global or user-learned category prediction rule',
  version: 1,
  primaryKey: 'key',
  type: 'object',
  properties: {
    key: { type: 'string', maxLength: 200 },
    categoryWeights: { type: 'object' },
    enabled: { type: 'boolean' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' }
  },
  required: ['key', 'enabled', 'updatedAt']
};
