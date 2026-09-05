import { createRxDatabase, addRxPlugin, RxJsonSchema } from 'rxdb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { TRANSACTION_SCHEMA } from './schemas/transaction.schema';

addRxPlugin(RxDBMigrationSchemaPlugin);

const TRANSACTION_SCHEMA_V6: RxJsonSchema<Record<string, unknown>> = {
  title: 'transaction schema',
  description: 'describes a transaction',
  version: 6,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    date: { type: 'string' },
    description: { type: 'string' },
    amount: { type: 'number' },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
    balance: { type: 'number' },
    account: { type: 'string' },
    accountId: { type: 'string' },
    importBatchId: { type: 'string' },
    transferAccountId: { type: 'string' },
    linkedTransactionId: { type: 'string' },
    budgetId: { type: 'string' },
    pendingReview: { type: 'boolean' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' },
    shares: { type: 'number' },
    price: { type: 'number' },
    fee: { type: 'number' },
    tax: { type: 'number' },
    symbol: { type: 'string' },
    assetName: { type: 'string' },
    assetType: { type: 'string' },
    investmentType: { type: 'string' }
  },
  required: ['id', 'date', 'description', 'amount', 'category', 'accountId', 'importBatchId', 'updatedAt']
};

interface LegacyTransactionDoc {
  readonly [field: string]: unknown;
  readonly id?: string;
  readonly isRecurring?: boolean;
}

const MIGRATION_STRATEGIES = {
  1: (d: LegacyTransactionDoc) => d,
  2: (d: LegacyTransactionDoc) => d,
  3: (d: LegacyTransactionDoc) => d,
  4: (d: LegacyTransactionDoc) => d,
  5: (d: LegacyTransactionDoc) => d,
  6: (d: LegacyTransactionDoc) => d,
  7: (d: LegacyTransactionDoc) => d,
  8: (d: LegacyTransactionDoc) => d,
  9: (d: LegacyTransactionDoc) => d,
  10: (d: LegacyTransactionDoc) => d
};

const LEGACY_ROWS = [
  {
    id: 'tx-legacy-1',
    date: '2026-08-15',
    description: 'Hotel Algarve',
    amount: -300,
    category: 'Travel',
    accountId: 'acc-bank',
    importBatchId: 'batch-1',
    budgetId: 'proj-vac',
    tags: ['ferias'],
    balance: 1200.55,
    updatedAt: 1,
    deleted: false
  },
  {
    id: 'tx-legacy-2',
    date: '2026-08-16',
    description: 'Supermercado',
    amount: -42.13,
    category: 'Groceries',
    accountId: 'acc-bank',
    importBatchId: 'batch-1',
    updatedAt: 2,
    deleted: false
  }
];

describe('TRANSACTION_SCHEMA migration v6 → current', () => {
  const storage = getRxStorageMemory();
  const name = 'migration_probe_' + Date.now();

  beforeAll(async () => {
    const legacyDb = await createRxDatabase({ name, storage });
    await legacyDb.addCollections({
      transactions: { schema: TRANSACTION_SCHEMA_V6 as never, migrationStrategies: MIGRATION_STRATEGIES }
    });
    await legacyDb.collections['transactions'].bulkInsert(LEGACY_ROWS);
    await legacyDb.close();
  });

  it('opens a v6 database with the current schema without losing a single row', async () => {
    const db = await createRxDatabase({ name, storage });
    await db.addCollections({
      transactions: { schema: TRANSACTION_SCHEMA as never, migrationStrategies: MIGRATION_STRATEGIES }
    });

    const docs = await db.collections['transactions'].find().exec();
    expect(docs.map((d: LegacyTransactionDoc) => d.id).sort()).toEqual(['tx-legacy-1', 'tx-legacy-2']);

    await db.close();
  });

  it('carries every pre-existing field across untouched, including the project assignment', async () => {
    const db = await createRxDatabase({ name, storage });
    await db.addCollections({
      transactions: { schema: TRANSACTION_SCHEMA as never, migrationStrategies: MIGRATION_STRATEGIES }
    });

    const migrated = await db.collections['transactions'].findOne('tx-legacy-1').exec();
    expect(migrated.toJSON()).toMatchObject({
      description: 'Hotel Algarve',
      amount: -300,
      category: 'Travel',
      budgetId: 'proj-vac',
      tags: ['ferias'],
      balance: 1200.55
    });

    await db.close();
  });

  it('leaves the recurrence flag unset on migrated rows, so no past movement is retroactively confirmed', async () => {
    const db = await createRxDatabase({ name, storage });
    await db.addCollections({
      transactions: { schema: TRANSACTION_SCHEMA as never, migrationStrategies: MIGRATION_STRATEGIES }
    });

    const migrated = await db.collections['transactions'].find().exec();
    expect(migrated.every((doc: LegacyTransactionDoc) => doc.isRecurring === undefined)).toBe(true);

    await db.close();
  });

  it('leaves budgetAutoAssigned unset on migrated rows, so nothing is retroactively treated as window-assigned', async () => {
    const db = await createRxDatabase({ name, storage });
    await db.addCollections({
      transactions: { schema: TRANSACTION_SCHEMA as never, migrationStrategies: MIGRATION_STRATEGIES }
    });

    const migrated = await db.collections['transactions'].findOne('tx-legacy-1').exec();
    expect(migrated.toJSON().budgetAutoAssigned).toBeUndefined();

    await db.close();
  });

  it('accepts the new field on rows written after the migration', async () => {
    const db = await createRxDatabase({ name, storage });
    await db.addCollections({
      transactions: { schema: TRANSACTION_SCHEMA as never, migrationStrategies: MIGRATION_STRATEGIES }
    });

    await db.collections['transactions'].insert({
      id: 'tx-new',
      date: '2026-08-20',
      description: 'Loja',
      amount: -18.5,
      category: 'Others',
      accountId: 'acc-bank',
      importBatchId: 'batch-1',
      budgetId: 'proj-vac',
      budgetAutoAssigned: true,
      updatedAt: 3,
      deleted: false
    });

    const created = await db.collections['transactions'].findOne('tx-new').exec();
    expect(created.toJSON().budgetAutoAssigned).toBe(true);

    await db.close();
  });
});
