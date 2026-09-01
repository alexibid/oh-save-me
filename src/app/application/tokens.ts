import { InjectionToken } from '@angular/core';
import { AccountRepository } from '@domain/repositories/account.repository';
import { CategoryRepository } from '@domain/repositories/category.repository';
import { CustomizationRepository } from '@domain/repositories/customization.repository';
import { HistoryLogRepository } from '@domain/repositories/history-log.repository';
import { ImportBatchRepository } from '@domain/repositories/import-batch.repository';
import { TransactionRepository } from '@domain/repositories/transaction.repository';
import { BudgetRepository } from '@domain/repositories/budget.repository';
import { MlRuleRepository } from '@domain/repositories/ml-rule.repository';
import { MappingRuleRepository } from '@domain/repositories/mapping-rule.repository';
import { ColumnClassifierWeightsRepository } from '@domain/repositories/column-classifier-weights.repository';
import { UnitRepository } from '@domain/repositories/unit.repository';
import { CustomRecordRepository } from '@domain/repositories/custom-record.repository';

export const ACCOUNT_REPOSITORY_TOKEN = new InjectionToken<AccountRepository>('AccountRepository');
export const CATEGORY_REPOSITORY_TOKEN = new InjectionToken<CategoryRepository>('CategoryRepository');
export const CUSTOMIZATION_REPOSITORY_TOKEN = new InjectionToken<CustomizationRepository>('CustomizationRepository');
export const HISTORY_LOG_REPOSITORY_TOKEN = new InjectionToken<HistoryLogRepository>('HistoryLogRepository');
export const IMPORT_BATCH_REPOSITORY_TOKEN = new InjectionToken<ImportBatchRepository>('ImportBatchRepository');
export const TRANSACTION_REPOSITORY_TOKEN = new InjectionToken<TransactionRepository>('TransactionRepository');
export const BUDGET_REPOSITORY_TOKEN = new InjectionToken<BudgetRepository>('BudgetRepository');
export const ML_RULE_REPOSITORY_TOKEN = new InjectionToken<MlRuleRepository>('MlRuleRepository');
export const MAPPING_RULE_REPOSITORY_TOKEN = new InjectionToken<MappingRuleRepository>('MappingRuleRepository');
export const COLUMN_CLASSIFIER_WEIGHTS_REPOSITORY_TOKEN =
  new InjectionToken<ColumnClassifierWeightsRepository>('ColumnClassifierWeightsRepository');
export const UNIT_REPOSITORY_TOKEN = new InjectionToken<UnitRepository>('UnitRepository');
export const CUSTOM_RECORD_REPOSITORY_TOKEN = new InjectionToken<CustomRecordRepository>('CustomRecordRepository');
export const SYNC_SERVICE_TOKEN = new InjectionToken<unknown>('SyncService');
