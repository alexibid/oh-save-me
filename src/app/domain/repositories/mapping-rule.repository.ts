import { MappingRule } from '@domain/models/mapping-rule';

export interface MappingRuleRepository {
  getAll(): Promise<readonly MappingRule[]>;
  upsert(rule: Readonly<MappingRule>): Promise<void>;
  delete(signatureKey: string): Promise<void>;
  clear(): Promise<void>;
}
