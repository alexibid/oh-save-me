import { Injectable, inject } from '@angular/core';
import { GoogleAuthService } from '@infrastructure/sync/google-auth.service';
import { GoogleDriveSyncService, DriveVaultFile } from '@ibid/services';
import { useStore } from '@application/app-store';
import { DbSnapshot, partitionSnapshotByScope, computeDbImportPreview } from '@domain/shared/db-snapshot.utils';
import { Transaction } from '@domain/models/transaction';
import { isFinancialAccount } from '@domain/models/account';
import { serializeIngestedTransactionsToCsv, buildImportBatchFileName } from '@domain/shared/ingested-csv.utils';

@Injectable({
  providedIn: 'root'
})
export class DriveSyncCoordinatorService {
  private readonly auth = inject(GoogleAuthService);
  private readonly driveSync = inject(GoogleDriveSyncService);
  private readonly store = useStore();
  private isSyncInProgress = false;

  constructor() {
    this.setupWindowListeners();
  }

  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.auth.isAuthenticated()) {
        this.syncNow();
      }
    });

    window.addEventListener('focus', () => {
      if (this.auth.isAuthenticated()) {
        this.syncNow();
      }
    });
  }

  public createLocalSnapshot(): DbSnapshot {
    return {
      version: 1,
      exportDate: new Date().toISOString(),
      data: {
        accounts: this.store.accounts(),
        transactions: this.store.transactions(),
        categories: this.store.categories(),
        budgets: this.store.budgets(),
        customRecords: this.store.customRecords()
      }
    };
  }

  public async uploadIngestedImportBatch(
    batchFileName: string,
    transactions: readonly Transaction[],
    accountName?: string
  ): Promise<string | null> {
    if (!this.auth.isAuthenticated() || transactions.length === 0) {
      return null;
    }

    try {
      const accountId = transactions[0]?.accountId;
      const account = this.store.accounts().find(a => a.id === accountId);
      const isJoint = !!(account && isFinancialAccount(account) && account.scope === 'joint');

      const csvContent = serializeIngestedTransactionsToCsv(transactions, {
        accounts: this.store.accounts(),
        categories: this.store.categories(),
        budgets: this.store.budgets()
      });

      const fileName = buildImportBatchFileName(batchFileName, accountName ?? (account?.name || ''));
      const uploadedId = await this.driveSync.uploadImportBatchCsv(fileName, csvContent, isJoint);
      await this.syncNow();
      return uploadedId;
    } catch {
      return null;
    }
  }

  private async syncVaultChannel(
    localScopedSnapshot: DbSnapshot,
    existingVault: DriveVaultFile | null,
    createVaultFn: (json: string) => Promise<string | null>
  ): Promise<boolean> {
    if (!existingVault) {
      if (localScopedSnapshot.data.accounts.length === 0 && localScopedSnapshot.data.transactions.length === 0) {
        return true;
      }
      const jsonContent = JSON.stringify(localScopedSnapshot, null, 2);
      const createdId = await createVaultFn(jsonContent);
      return Boolean(createdId);
    }

    const remoteSnapshot = await this.driveSync.downloadVaultFile<DbSnapshot>(existingVault.id);
    if (!remoteSnapshot) {
      return false;
    }

    const remotePreview = computeDbImportPreview(remoteSnapshot, {
      accounts: this.store.accounts(),
      transactions: this.store.transactions(),
      categories: this.store.categories(),
      budgets: this.store.budgets(),
      customRecords: this.store.customRecords()
    });

    const hasRemoteItemsToApply =
      remotePreview.accountsToImport.length > 0 ||
      remotePreview.categoriesToImport.length > 0 ||
      remotePreview.budgetsToImport.length > 0 ||
      remotePreview.customRecordsToImport.length > 0 ||
      remotePreview.transactionsToImport.length > 0;

    if (hasRemoteItemsToApply) {
      await this.store.importDbSnapshot(remotePreview);
    }

    const updatedFullSnapshot = this.createLocalSnapshot();
    const { privateSnapshot: updatedPrivate, jointSnapshot: updatedJoint } =
      partitionSnapshotByScope(updatedFullSnapshot);
    const updatedScoped = existingVault.isShared ? updatedJoint : updatedPrivate;

    const localPreviewOnRemote = computeDbImportPreview(updatedScoped, {
      accounts: remoteSnapshot.data.accounts,
      transactions: remoteSnapshot.data.transactions,
      categories: remoteSnapshot.data.categories,
      budgets: remoteSnapshot.data.budgets,
      customRecords: remoteSnapshot.data.customRecords
    });

    const hasLocalItemsToPush =
      localPreviewOnRemote.accountsToImport.length > 0 ||
      localPreviewOnRemote.categoriesToImport.length > 0 ||
      localPreviewOnRemote.budgetsToImport.length > 0 ||
      localPreviewOnRemote.customRecordsToImport.length > 0 ||
      localPreviewOnRemote.transactionsToImport.length > 0;

    if (hasLocalItemsToPush) {
      const jsonToUpload = JSON.stringify(updatedScoped, null, 2);
      return await this.driveSync.updateVaultFile(existingVault.id, jsonToUpload);
    }

    return true;
  }

  public async syncNow(): Promise<boolean> {
    if (!this.auth.isAuthenticated() || this.isSyncInProgress) {
      return false;
    }

    this.isSyncInProgress = true;
    this.driveSync.syncStatus.set('syncing');

    try {
      const localFullSnapshot = this.createLocalSnapshot();
      const { privateSnapshot, jointSnapshot } = partitionSnapshotByScope(localFullSnapshot);

      const existingPrivate = await this.driveSync.findPrivateVaultFile();
      const existingJoint = await this.driveSync.findJointVaultFile();

      const privateSuccess = await this.syncVaultChannel(
        privateSnapshot,
        existingPrivate,
        json => this.driveSync.createPrivateVault(json)
      );

      const jointSuccess = await this.syncVaultChannel(
        jointSnapshot,
        existingJoint,
        json => this.driveSync.createJointVault(json)
      );

      if (!privateSuccess && !jointSuccess) {
        throw new Error('Failed to sync vaults with Google Drive');
      }

      this.driveSync.markSynced();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.driveSync.syncStatus.set('error');
      this.driveSync.errorMessage.set(msg);
      return false;
    } finally {
      this.isSyncInProgress = false;
    }
  }
}
