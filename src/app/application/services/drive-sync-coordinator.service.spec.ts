import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DriveSyncCoordinatorService } from './drive-sync-coordinator.service';
import { GoogleAuthService } from '@infrastructure/sync/google-auth.service';
import { GoogleDriveSyncService, GoogleAuthService as IbidGoogleAuthService } from '@ibid/services';
import { AppStore, APP_STORE_TOKEN } from '@application/app-store';
import { DbSnapshot } from '@domain/shared/db-snapshot.utils';
import { MOCK_INGESTED_TRANSACTIONS } from '../../../mocks/ingested-csv.mock';

describe('DriveSyncCoordinatorService', () => {
  let authService: GoogleAuthService;
  let driveSyncService: GoogleDriveSyncService;
  let mockStore: Partial<AppStore>;
  let coordinator: DriveSyncCoordinatorService;

  const mockSnapshot: DbSnapshot = {
    version: 1,
    exportDate: '2026-08-30T12:00:00.000Z',
    data: {
      accounts: [],
      transactions: [],
      categories: [],
      budgets: [],
      customRecords: []
    }
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    authService = new GoogleAuthService();
    authService.accessToken.set('valid-token');
    authService.tokenExpiresAt.set(Date.now() + 3600000);
    authService.status.set('connected');

    mockStore = {
      accounts: vi.fn().mockReturnValue([]) as unknown as AppStore['accounts'],
      transactions: vi.fn().mockReturnValue([]) as unknown as AppStore['transactions'],
      categories: vi.fn().mockReturnValue([]) as unknown as AppStore['categories'],
      budgets: vi.fn().mockReturnValue([]) as unknown as AppStore['budgets'],
      customRecords: vi.fn().mockReturnValue([]) as unknown as AppStore['customRecords'],
      importDbSnapshot: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: GoogleAuthService, useValue: authService },
        { provide: IbidGoogleAuthService, useValue: authService },
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]
    });
    driveSyncService = TestBed.inject(GoogleDriveSyncService);
    coordinator = TestBed.inject(DriveSyncCoordinatorService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not sync if user is not authenticated', async () => {
    authService.logout();
    const result = await coordinator.syncNow();
    expect(result).toBe(false);
  });

  it('should create new private vault file when none exists on Drive', async () => {
    vi.spyOn(driveSyncService, 'findPrivateVaultFile').mockResolvedValue(null);
    vi.spyOn(driveSyncService, 'findJointVaultFile').mockResolvedValue(null);
    vi.spyOn(driveSyncService, 'createPrivateVault').mockResolvedValue('vault-new-id');
    const markSyncedSpy = vi.spyOn(driveSyncService, 'markSynced');

    const result = await coordinator.syncNow();
    expect(result).toBe(true);
    expect(markSyncedSpy).toHaveBeenCalled();
  });

  it('should download and merge remote snapshot when private vault file exists', async () => {
    vi.spyOn(driveSyncService, 'findPrivateVaultFile').mockResolvedValue({
      id: 'vault-file-123',
      name: 'vault-private.json',
      modifiedTime: '2026-08-30T13:00:00.000Z',
      isShared: false
    });
    vi.spyOn(driveSyncService, 'findJointVaultFile').mockResolvedValue(null);

    vi.spyOn(driveSyncService, 'downloadVaultFile').mockResolvedValue(mockSnapshot);
    vi.spyOn(driveSyncService, 'updateVaultFile').mockResolvedValue(true);
    const markSyncedSpy = vi.spyOn(driveSyncService, 'markSynced');

    const result = await coordinator.syncNow();
    expect(result).toBe(true);
    expect(markSyncedSpy).toHaveBeenCalled();
  });

  it('should serialize and upload ingested import batch CSV when authenticated', async () => {
    const uploadSpy = vi.spyOn(driveSyncService, 'uploadImportBatchCsv').mockResolvedValue('uploaded-csv-id');
    const syncSpy = vi.spyOn(coordinator, 'syncNow').mockResolvedValue(true);

    const result = await coordinator.uploadIngestedImportBatch('extrato_agosto.csv', MOCK_INGESTED_TRANSACTIONS, 'CGD');
    expect(result).toBe('uploaded-csv-id');
    expect(uploadSpy).toHaveBeenCalled();
    expect(syncSpy).toHaveBeenCalled();
  });
});
