import { computeDbImportPreview, partitionSnapshotByScope, mergeScopedSnapshots, DbSnapshot } from './db-snapshot.utils';
import { Account } from '@domain/models/account';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { CustomRecord } from '@domain/models/custom-record';

const account = (id: string): Account => ({
  id, name: id, updatedAt: 0, kind: 'financial', type: 'bank_account',
  scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
});

const transaction = (id: string): Transaction => ({
  id, date: '2026-01-01', description: id, amount: -10, category: 'cat-1', accountId: 'acc-1'
});

const category = (id: string): CategoryInfo => ({ id, name: id, icon: 'label', color: '#000' });

const budget = (id: string): Budget => ({ id, name: id, type: 'project', amount: 100, tags: ['x'] });

const customRecord = (id: string): CustomRecord => ({
  id, accountId: 'acc-1', date: '2026-01-01', dimensions: {}, measures: {}, updatedAt: 0
});

const emptyCurrent = { accounts: [], transactions: [], categories: [], budgets: [], customRecords: [] };

function snapshotWith(overrides: Partial<DbSnapshot['data']>): DbSnapshot {
  return {
    version: 1,
    exportDate: '2026-01-01T00:00:00.000Z',
    data: {
      accounts: [], transactions: [], categories: [], budgets: [], customRecords: [],
      ...overrides
    }
  };
}

describe('computeDbImportPreview', () => {
  it('returns everything as new and zero skipped for an empty current store', () => {
    const snapshot = snapshotWith({
      accounts: [account('a1')],
      transactions: [transaction('t1')],
      categories: [category('c1')],
      budgets: [budget('b1')],
      customRecords: [customRecord('r1')]
    });

    const preview = computeDbImportPreview(snapshot, emptyCurrent);

    expect(preview.accountsToImport).toEqual([account('a1')]);
    expect(preview.transactionsToImport).toEqual([transaction('t1')]);
    expect(preview.categoriesToImport).toEqual([category('c1')]);
    expect(preview.budgetsToImport).toEqual([budget('b1')]);
    expect(preview.customRecordsToImport).toEqual([customRecord('r1')]);
    expect(preview.skippedCounts).toEqual({ accounts: 0, categories: 0, budgets: 0, customRecords: 0, transactions: 0 });
  });

  it('skips every record whose id already exists locally, importing nothing', () => {
    const snapshot = snapshotWith({
      accounts: [account('a1')],
      transactions: [transaction('t1')]
    });
    const current = { ...emptyCurrent, accounts: [account('a1')], transactions: [transaction('t1')] };

    const preview = computeDbImportPreview(snapshot, current);

    expect(preview.accountsToImport).toEqual([]);
    expect(preview.transactionsToImport).toEqual([]);
    expect(preview.skippedCounts.accounts).toBe(1);
    expect(preview.skippedCounts.transactions).toBe(1);
  });

  it('partitions a mixed snapshot of new and duplicate transactions independently per collection', () => {
    const snapshot = snapshotWith({
      transactions: [transaction('t1'), transaction('t2'), transaction('t3')],
      categories: [category('c1')]
    });
    const current = { ...emptyCurrent, transactions: [transaction('t2')] };

    const preview = computeDbImportPreview(snapshot, current);

    expect(preview.transactionsToImport.map(t => t.id)).toEqual(['t1', 't3']);
    expect(preview.skippedCounts.transactions).toBe(1);

    expect(preview.categoriesToImport).toEqual([category('c1')]);
    expect(preview.skippedCounts.categories).toBe(0);
  });

  it('handles a fully empty snapshot without importing or skipping anything', () => {
    const preview = computeDbImportPreview(snapshotWith({}), emptyCurrent);

    expect(preview.accountsToImport).toEqual([]);
    expect(preview.transactionsToImport).toEqual([]);
    expect(preview.categoriesToImport).toEqual([]);
    expect(preview.budgetsToImport).toEqual([]);
    expect(preview.customRecordsToImport).toEqual([]);
    expect(preview.skippedCounts).toEqual({ accounts: 0, categories: 0, budgets: 0, customRecords: 0, transactions: 0 });
  });

  describe('cross-device account matching (regression: importing a .db from another session must not duplicate accounts)', () => {
    it('matches an incoming account to an existing one by name+type when ids differ, and does not add a duplicate account', () => {
      const localCgd: Account = {
        id: 'acc_local_1', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const foreignCgd: Account = {
        id: 'acc_foreign_2', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const snapshot = snapshotWith({ accounts: [foreignCgd] });
      const current = { ...emptyCurrent, accounts: [localCgd] };

      const preview = computeDbImportPreview(snapshot, current);

      expect(preview.accountsToImport).toEqual([]);
      expect(preview.skippedCounts.accounts).toBe(1);
    });

    it('remaps a matched account\'s transactions onto the LOCAL account id, not the foreign one from the snapshot', () => {
      const localCgd: Account = {
        id: 'acc_local_1', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const foreignCgd: Account = {
        id: 'acc_foreign_2', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const foreignTx: Transaction = {
        id: 'tx_from_other_device', date: '2026-06-01', description: 'Pharmacy', amount: -12,
        category: 'Healthcare', accountId: 'acc_foreign_2'
      };
      const snapshot = snapshotWith({ accounts: [foreignCgd], transactions: [foreignTx] });
      const current = { ...emptyCurrent, accounts: [localCgd] };

      const preview = computeDbImportPreview(snapshot, current);

      expect(preview.transactionsToImport).toHaveLength(1);
      expect(preview.transactionsToImport[0].accountId).toBe('acc_local_1');
    });

    it('does not import a transaction that already exists locally under the local account, even though its incoming id differs', () => {
      const localCgd: Account = {
        id: 'acc_local_1', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const foreignCgd: Account = {
        id: 'acc_foreign_2', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };

      const localTx: Transaction = {
        id: 'tx_local_hash', date: '2026-06-01', description: 'Pharmacy', amount: -12,
        category: 'Healthcare', accountId: 'acc_local_1'
      };
      const foreignTx: Transaction = {
        id: 'tx_foreign_hash', date: '2026-06-01', description: 'Pharmacy', amount: -12,
        category: 'Healthcare', accountId: 'acc_foreign_2'
      };
      const snapshot = snapshotWith({ accounts: [foreignCgd], transactions: [foreignTx] });
      const current = { ...emptyCurrent, accounts: [localCgd], transactions: [localTx] };

      const preview = computeDbImportPreview(snapshot, current);

      expect(preview.transactionsToImport).toEqual([]);
      expect(preview.skippedCounts.transactions).toBe(1);
    });

    it('does not merge accounts that share a name but differ in type', () => {
      const localBank: Account = {
        id: 'acc_local_1', name: 'Main Account', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const foreignInvestment: Account = {
        id: 'acc_foreign_2', name: 'Main Account', updatedAt: 0, kind: 'financial', type: 'investment',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const snapshot = snapshotWith({ accounts: [foreignInvestment] });
      const current = { ...emptyCurrent, accounts: [localBank] };

      const preview = computeDbImportPreview(snapshot, current);

      expect(preview.accountsToImport).toEqual([foreignInvestment]);
      expect(preview.skippedCounts.accounts).toBe(0);
    });

    it('adds a genuinely new account as-is (unchanged id) when no local account matches its name+type', () => {
      const localCgd: Account = {
        id: 'acc_local_1', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const foreignTradeRepublic: Account = {
        id: 'acc_foreign_tr', name: 'Trade Republic Investimentos', updatedAt: 0, kind: 'financial', type: 'investment',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const snapshot = snapshotWith({ accounts: [foreignTradeRepublic] });
      const current = { ...emptyCurrent, accounts: [localCgd] };

      const preview = computeDbImportPreview(snapshot, current);

      expect(preview.accountsToImport).toEqual([foreignTradeRepublic]);
    });

    it('preserves legitimate repeated same-day/description/amount transactions instead of collapsing them via content dedup', () => {
      const localCgd: Account = {
        id: 'acc_local_1', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };
      const foreignCgd: Account = {
        id: 'acc_foreign_2', name: 'CGD Extrato Normal', updatedAt: 0, kind: 'financial', type: 'bank_account',
        scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
      };

      const localTx: Transaction = {
        id: 'tx_local_1', date: '2026-06-01', description: 'Vending machine', amount: -2, category: 'Others', accountId: 'acc_local_1'
      };
      const foreignTx1: Transaction = {
        id: 'tx_foreign_1', date: '2026-06-01', description: 'Vending machine', amount: -2, category: 'Others', accountId: 'acc_foreign_2'
      };
      const foreignTx2: Transaction = {
        id: 'tx_foreign_2', date: '2026-06-01', description: 'Vending machine', amount: -2, category: 'Others', accountId: 'acc_foreign_2'
      };
      const snapshot = snapshotWith({ accounts: [foreignCgd], transactions: [foreignTx1, foreignTx2] });
      const current = { ...emptyCurrent, accounts: [localCgd], transactions: [localTx] };
      const preview = computeDbImportPreview(snapshot, current);

      expect(preview.transactionsToImport).toHaveLength(1);
      expect(preview.skippedCounts.transactions).toBe(1);
    });
  });

  describe('partitionSnapshotByScope and mergeScopedSnapshots', () => {
    const privateAcc: Account = {
      id: 'acc_private', name: 'Private Card', updatedAt: 0, kind: 'financial', type: 'credit_card',
      scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
    };
    const jointAcc: Account = {
      id: 'acc_joint', name: 'Joint House Account', updatedAt: 0, kind: 'financial', type: 'bank_account',
      scope: 'joint', includeInConsolidatedBalance: true, unit: 'EUR'
    };

    const privateTx: Transaction = {
      id: 'tx_p1', date: '2026-08-01', description: 'Personal Coffee', amount: -3, category: 'cat-1', accountId: 'acc_private'
    };
    const jointTx: Transaction = {
      id: 'tx_j1', date: '2026-08-02', description: 'Groceries Casa', amount: -65, category: 'cat-1', accountId: 'acc_joint'
    };

    it('partitions full snapshot into private and joint subsets based on account scope', () => {
      const fullSnapshot = snapshotWith({
        accounts: [privateAcc, jointAcc],
        transactions: [privateTx, jointTx],
        budgets: [budget('b_vacation')],
        categories: [category('c1')]
      });

      const { privateSnapshot, jointSnapshot } = partitionSnapshotByScope(fullSnapshot);

      expect(privateSnapshot.data.accounts).toEqual([privateAcc]);
      expect(privateSnapshot.data.transactions).toEqual([privateTx]);

      expect(jointSnapshot.data.accounts).toEqual([jointAcc]);
      expect(jointSnapshot.data.transactions).toEqual([jointTx]);
    });

    it('merges scoped snapshots back into a unified database snapshot', () => {
      const pSnap = snapshotWith({
        accounts: [privateAcc],
        transactions: [privateTx]
      });
      const jSnap = snapshotWith({
        accounts: [jointAcc],
        transactions: [jointTx]
      });

      const merged = mergeScopedSnapshots(pSnap, jSnap);
      expect(merged.data.accounts).toHaveLength(2);
      expect(merged.data.transactions).toHaveLength(2);
    });
  });
});
