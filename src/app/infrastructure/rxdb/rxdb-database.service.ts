import { Injectable } from '@angular/core';
import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin, removeRxDatabase } from 'rxdb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxTransactionDocument, TRANSACTION_SCHEMA } from './schemas/transaction.schema';
import { RxCategoryDocument, CATEGORY_SCHEMA } from './schemas/category.schema';
import { RxBudgetDocument, BUDGET_SCHEMA } from './schemas/budget.schema';
import { RxHistoryLogSchema } from './schemas/history-log.schema';
import { RxCustomizationSchema } from './schemas/customization.schema';
import { RxAccountDocument, ACCOUNT_SCHEMA } from './schemas/account.schema';
import { RxImportBatchDocument, IMPORT_BATCH_SCHEMA } from './schemas/import-batch.schema';
import { RxMlRuleDocument, ML_RULE_SCHEMA } from './schemas/ml-rule.schema';
import { RxMappingRuleDocument, MAPPING_RULE_SCHEMA } from './schemas/mapping-rule.schema';
import { RxColumnClassifierWeightsDocument, COLUMN_CLASSIFIER_WEIGHTS_SCHEMA } from './schemas/column-classifier-weights.schema';
import { RxUnitDocument, UNIT_SCHEMA } from './schemas/unit.schema';
import { RxCustomRecordDocument, CUSTOM_RECORD_SCHEMA } from './schemas/custom-record.schema';

addRxPlugin(RxDBMigrationSchemaPlugin);

export interface AppDatabaseCollections {
  transactions: RxCollection<RxTransactionDocument>;
  categories: RxCollection<RxCategoryDocument>;
  budgets: RxCollection<RxBudgetDocument>;
  history_logs: RxCollection<any>;
  customizations: RxCollection<any>;
  accounts: RxCollection<RxAccountDocument>;
  import_batches: RxCollection<RxImportBatchDocument>;
  ml_rules: RxCollection<RxMlRuleDocument>;
  mapping_rules: RxCollection<RxMappingRuleDocument>;
  column_classifier_weights: RxCollection<RxColumnClassifierWeightsDocument>;
  units: RxCollection<RxUnitDocument>;
  custom_records: RxCollection<RxCustomRecordDocument>;
}

export type AppDatabase = RxDatabase<AppDatabaseCollections>;

const isTestEnv = typeof window !== 'undefined' &&
  ('vitest' in window || '__vitest_worker__' in window || (window as any).__karma__ || (window as any).jasmine);

@Injectable({
  providedIn: 'root'
})
export class RxDbDatabaseService {
  private static dbInstance?: AppDatabase;
  private static initPromise?: Promise<AppDatabase>;

  async getDatabase(): Promise<AppDatabase> {
    if (RxDbDatabaseService.dbInstance) {
      return RxDbDatabaseService.dbInstance;
    }
    return this.initDatabase();
  }

  async initDatabase(): Promise<AppDatabase> {
    if (RxDbDatabaseService.dbInstance) {
      return RxDbDatabaseService.dbInstance;
    }
    if (RxDbDatabaseService.initPromise) {
      return RxDbDatabaseService.initPromise;
    }

    RxDbDatabaseService.initPromise = (async () => {
      const storage = isTestEnv ? getRxStorageMemory() : getRxStorageDexie();
      const dbName = isTestEnv
        ? `app_db_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        : 'app_db';

      try {
        const db = await createRxDatabase<AppDatabaseCollections>({
          name: dbName,
          storage,
          ignoreDuplicate: false,
          multiInstance: !isTestEnv
        });

        await db.addCollections({
          transactions: {
            schema: TRANSACTION_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => {
                oldDoc.account = 'Extrato Banco';
                return oldDoc;
              },
              2: (oldDoc: any) => {
                oldDoc.accountId = 'default_account';
                oldDoc.importBatchId = 'legacy_import';
                return oldDoc;
              },
              3: (oldDoc: any) => {
                return oldDoc;
              },
              4: (oldDoc: any) => {
                return oldDoc;
              },
              5: (oldDoc: any) => {
                return oldDoc;
              },
              6: (oldDoc: any) => {
                return oldDoc;
              },
              7: (oldDoc: any) => {
                return oldDoc;
              },
              8: (oldDoc: any) => {
                return oldDoc;
              },
              9: (oldDoc: any) => {
                return oldDoc;
              },
              10: (oldDoc: any) => {
                return oldDoc;
              }
            }
          },
          categories: {
            schema: CATEGORY_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => {
                oldDoc.enabled = true;
                return oldDoc;
              },
              2: (oldDoc: any) => {
                delete oldDoc.enabled;
                return oldDoc;
              },
              3: (oldDoc: any) => {
                oldDoc.enabled = true;
                return oldDoc;
              },
              4: (oldDoc: any) => oldDoc
            }
          },
          budgets: {
            schema: BUDGET_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => oldDoc,
              2: (oldDoc: any) => oldDoc,
              3: (oldDoc: any) => oldDoc,
              4: (oldDoc: any) => {
                const paid = oldDoc.paidInstalments ?? 0;
                const remaining = oldDoc.remainingInstalments ?? 0;
                if (remaining > 0 || paid > 0) oldDoc.contractedInstalments = paid + remaining;
                delete oldDoc.remainingInstalments;
                return oldDoc;
              },
              5: (oldDoc: any) => oldDoc,
              6: (oldDoc: any) => oldDoc,
              7: (oldDoc: any) => oldDoc
            }
          },
          history_logs: {
            schema: RxHistoryLogSchema
          },
          customizations: {
            schema: RxCustomizationSchema
          },
          accounts: {
            schema: ACCOUNT_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => oldDoc,
              2: (oldDoc: any) => {
                oldDoc.kind = 'financial';
                oldDoc.scope = 'individual';
                oldDoc.includeInConsolidatedBalance = true;
                oldDoc.unit = 'EUR';
                return oldDoc;
              },
              3: (oldDoc: any) => {
                if (oldDoc.includeInConsolidatedBalance === undefined) {
                  oldDoc.includeInConsolidatedBalance = oldDoc.includeInFamilyBalance ?? true;
                }
                delete oldDoc.includeInFamilyBalance;
                return oldDoc;
              },
              4: (oldDoc: any) => oldDoc
            }
          },
          import_batches: {
            schema: IMPORT_BATCH_SCHEMA
          },
          ml_rules: {
            schema: ML_RULE_SCHEMA
          },
          mapping_rules: {
            schema: MAPPING_RULE_SCHEMA,
            migrationStrategies: {
              2: (oldDoc: any) => oldDoc
            }
          },
          column_classifier_weights: {
            schema: COLUMN_CLASSIFIER_WEIGHTS_SCHEMA
          },
          units: {
            schema: UNIT_SCHEMA
          },
          custom_records: {
            schema: CUSTOM_RECORD_SCHEMA
          }
        });

        RxDbDatabaseService.dbInstance = db;
        return db;
      } catch (err) {
        console.warn('[RxDbDatabaseService] Database initialization failed. Re-creating clean database...', err);
        try {
          await removeRxDatabase(dbName, storage);
        } catch (rmErr) {
          console.error('[RxDbDatabaseService] Failed to remove database:', rmErr);
        }

        const db = await createRxDatabase<AppDatabaseCollections>({
          name: dbName,
          storage,
          ignoreDuplicate: false,
          multiInstance: !isTestEnv
        });

        await db.addCollections({
          transactions: {
            schema: TRANSACTION_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => {
                oldDoc.account = 'Extrato Banco';
                return oldDoc;
              },
              2: (oldDoc: any) => {
                oldDoc.accountId = 'default_account';
                oldDoc.importBatchId = 'legacy_import';
                return oldDoc;
              },
              3: (oldDoc: any) => {
                return oldDoc;
              },
              4: (oldDoc: any) => {
                return oldDoc;
              },
              5: (oldDoc: any) => {
                return oldDoc;
              },
              6: (oldDoc: any) => {
                return oldDoc;
              },
              7: (oldDoc: any) => {
                return oldDoc;
              },
              8: (oldDoc: any) => {
                return oldDoc;
              },
              9: (oldDoc: any) => {
                return oldDoc;
              },
              10: (oldDoc: any) => {
                return oldDoc;
              }
            }
          },
          categories: {
            schema: CATEGORY_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => {
                oldDoc.enabled = true;
                return oldDoc;
              },
              2: (oldDoc: any) => {
                delete oldDoc.enabled;
                return oldDoc;
              },
              3: (oldDoc: any) => {
                oldDoc.enabled = true;
                return oldDoc;
              },
              4: (oldDoc: any) => oldDoc
            }
          },
          budgets: {
            schema: BUDGET_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => oldDoc,
              2: (oldDoc: any) => oldDoc,
              3: (oldDoc: any) => oldDoc,
              4: (oldDoc: any) => {
                const paid = oldDoc.paidInstalments ?? 0;
                const remaining = oldDoc.remainingInstalments ?? 0;
                if (remaining > 0 || paid > 0) oldDoc.contractedInstalments = paid + remaining;
                delete oldDoc.remainingInstalments;
                return oldDoc;
              },
              5: (oldDoc: any) => oldDoc,
              6: (oldDoc: any) => oldDoc,
              7: (oldDoc: any) => oldDoc
            }
          },
          history_logs: {
            schema: RxHistoryLogSchema
          },
          customizations: {
            schema: RxCustomizationSchema
          },
          accounts: {
            schema: ACCOUNT_SCHEMA,
            migrationStrategies: {
              1: (oldDoc: any) => oldDoc,
              2: (oldDoc: any) => {
                oldDoc.kind = 'financial';
                oldDoc.scope = 'individual';
                oldDoc.includeInConsolidatedBalance = true;
                oldDoc.unit = 'EUR';
                return oldDoc;
              },
              3: (oldDoc: any) => {
                if (oldDoc.includeInConsolidatedBalance === undefined) {
                  oldDoc.includeInConsolidatedBalance = oldDoc.includeInFamilyBalance ?? true;
                }
                delete oldDoc.includeInFamilyBalance;
                return oldDoc;
              },
              4: (oldDoc: any) => oldDoc
            }
          },
          import_batches: {
            schema: IMPORT_BATCH_SCHEMA
          },
          ml_rules: {
            schema: ML_RULE_SCHEMA
          },
          mapping_rules: {
            schema: MAPPING_RULE_SCHEMA,
            migrationStrategies: {
              2: (oldDoc: any) => oldDoc
            }
          },
          column_classifier_weights: {
            schema: COLUMN_CLASSIFIER_WEIGHTS_SCHEMA
          },
          units: {
            schema: UNIT_SCHEMA
          },
          custom_records: {
            schema: CUSTOM_RECORD_SCHEMA
          }
        });

        RxDbDatabaseService.dbInstance = db;
        return db;
      }
    })();

    try {
      return await RxDbDatabaseService.initPromise;
    } finally {
      RxDbDatabaseService.initPromise = undefined;
    }
  }
}
