import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyncFacadeService } from './sync-facade.service';
import { GoogleAuthService } from '@infrastructure/sync/google-auth.service';
import { GoogleDriveSyncService, GoogleAuthService as IbidGoogleAuthService } from '@ibid/services';
import { DriveSyncCoordinatorService } from './drive-sync-coordinator.service';
import { TestBed } from '@angular/core/testing';

describe('SyncFacadeService', () => {
  let facade: SyncFacadeService;
  let authService: GoogleAuthService;
  let coordinator: DriveSyncCoordinatorService;

  beforeEach(() => {
    authService = new GoogleAuthService();
    TestBed.configureTestingModule({
      providers: [
        SyncFacadeService,
        { provide: GoogleAuthService, useValue: authService },
        { provide: IbidGoogleAuthService, useValue: authService },
        {
          provide: DriveSyncCoordinatorService,
          useValue: {
            syncNow: vi.fn().mockResolvedValue(true)
          }
        }
      ]
    });

    facade = TestBed.inject(SyncFacadeService);
    coordinator = TestBed.inject(DriveSyncCoordinatorService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create facade', () => {
    expect(facade).toBeTruthy();
  });

  it('should delegate sync to coordinator', async () => {
    const syncSpy = vi.spyOn(coordinator, 'syncNow');
    const res = await facade.sync();
    expect(res).toBe(true);
    expect(syncSpy).toHaveBeenCalled();
  });

  it('should delegate authenticate to auth service', async () => {
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue(true);
    const res = await facade.authenticate();
    expect(res).toBe(true);
    expect(loginSpy).toHaveBeenCalled();
  });

  it('should delegate logout to auth service', () => {
    const logoutSpy = vi.spyOn(authService, 'logout');
    facade.logout();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
