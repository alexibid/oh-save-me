import { Provider } from '@angular/core';
import {
  TRANSACTION_REPOSITORY_TOKEN,
  CATEGORY_REPOSITORY_TOKEN,
  HISTORY_LOG_REPOSITORY_TOKEN,
  CUSTOMIZATION_REPOSITORY_TOKEN,
  ACCOUNT_REPOSITORY_TOKEN,
  IMPORT_BATCH_REPOSITORY_TOKEN,
  BUDGET_REPOSITORY_TOKEN,
  ML_RULE_REPOSITORY_TOKEN,
  MAPPING_RULE_REPOSITORY_TOKEN,
  COLUMN_CLASSIFIER_WEIGHTS_REPOSITORY_TOKEN,
  UNIT_REPOSITORY_TOKEN,
  CUSTOM_RECORD_REPOSITORY_TOKEN
} from '../application/tokens';
import { RxdbTransactionRepository } from './rxdb/rxdb-transaction.repository';
import { RxdbCategoryRepository } from './rxdb/rxdb-category.repository';
import { RxdbBudgetRepository } from './rxdb/rxdb-budget.repository';
import { RxdbHistoryLogRepository } from './rxdb/rxdb-history-log.repository';
import { RxdbCustomizationRepository } from './rxdb/rxdb-customization.repository';
import { RxdbAccountRepository } from './rxdb/rxdb-account.repository';
import { RxdbImportBatchRepository } from './rxdb/rxdb-import-batch.repository';
import { RxdbMlRuleRepository } from './rxdb/rxdb-ml-rule.repository';
import { RxdbMappingRuleRepository } from './rxdb/rxdb-mapping-rule.repository';
import { RxdbColumnClassifierWeightsRepository } from './rxdb/rxdb-column-classifier-weights.repository';
import { RxdbUnitRepository } from './rxdb/rxdb-unit.repository';
import { RxdbCustomRecordRepository } from './rxdb/rxdb-custom-record.repository';

export function provideTransactionRepository(): Provider {
  return {
    provide: TRANSACTION_REPOSITORY_TOKEN,
    useClass: RxdbTransactionRepository
  };
}

export function provideCategoryRepository(): Provider {
  return {
    provide: CATEGORY_REPOSITORY_TOKEN,
    useClass: RxdbCategoryRepository
  };
}

export function provideBudgetRepository(): Provider {
  return {
    provide: BUDGET_REPOSITORY_TOKEN,
    useClass: RxdbBudgetRepository
  };
}

export function provideHistoryLogRepository(): Provider {
  return {
    provide: HISTORY_LOG_REPOSITORY_TOKEN,
    useClass: RxdbHistoryLogRepository
  };
}

export function provideCustomizationRepository(): Provider {
  return {
    provide: CUSTOMIZATION_REPOSITORY_TOKEN,
    useClass: RxdbCustomizationRepository
  };
}

export function provideAccountRepository(): Provider {
  return {
    provide: ACCOUNT_REPOSITORY_TOKEN,
    useClass: RxdbAccountRepository
  };
}

export function provideImportBatchRepository(): Provider {
  return {
    provide: IMPORT_BATCH_REPOSITORY_TOKEN,
    useClass: RxdbImportBatchRepository
  };
}

export function provideMlRuleRepository(): Provider {
  return {
    provide: ML_RULE_REPOSITORY_TOKEN,
    useClass: RxdbMlRuleRepository
  };
}

export function provideMappingRuleRepository(): Provider {
  return {
    provide: MAPPING_RULE_REPOSITORY_TOKEN,
    useClass: RxdbMappingRuleRepository
  };
}

export function provideColumnClassifierWeightsRepository(): Provider {
  return {
    provide: COLUMN_CLASSIFIER_WEIGHTS_REPOSITORY_TOKEN,
    useClass: RxdbColumnClassifierWeightsRepository
  };
}

export function provideUnitRepository(): Provider {
  return {
    provide: UNIT_REPOSITORY_TOKEN,
    useClass: RxdbUnitRepository
  };
}

export function provideCustomRecordRepository(): Provider {
  return {
    provide: CUSTOM_RECORD_REPOSITORY_TOKEN,
    useClass: RxdbCustomRecordRepository
  };
}
