import { MlRule } from '@domain/models/ml-rule';

export interface MlRuleRepository {
  getAll(): Promise<readonly MlRule[]>;
  upsert(rule: Readonly<MlRule>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
