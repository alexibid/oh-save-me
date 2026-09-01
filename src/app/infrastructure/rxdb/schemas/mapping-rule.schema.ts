import { RxJsonSchema } from 'rxdb';
import { MappingRule } from '@domain/models/mapping-rule';

export interface RxMappingRuleDocument extends MappingRule {
  deleted?: boolean;
}

export const MAPPING_RULE_SCHEMA: RxJsonSchema<RxMappingRuleDocument> = {
  title: 'mapping rule schema',
  description: 'describes a learned CSV/XLSX column mapping for a previously-seen header signature',
  version: 2,
  primaryKey: 'signatureKey',
  type: 'object',
  properties: {
    signatureKey: { type: 'string', maxLength: 500 },
    mapping: { type: 'object' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' },
    qualityBaseline: { type: 'object' }
  },
  required: ['signatureKey', 'mapping', 'updatedAt']
};
