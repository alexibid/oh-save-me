import { Injectable, computed, inject } from '@angular/core';
import { GoogleDriveSyncService } from '@ibid/services';
import { GoogleAuthService } from '@infrastructure/sync/google-auth.service';
import { DriveSyncCoordinatorService } from './drive-sync-coordinator.service';

@Injectable({
  providedIn: 'root'
})
export class SyncFacadeService {
  private readonly googleDriveSync = inject(GoogleDriveSyncService);
  private readonly auth = inject(GoogleAuthService);
  private readonly coordinator = inject(DriveSyncCoordinatorService);

  public readonly syncStatus = this.googleDriveSync.syncStatus;
  public readonly lastSyncTime = this.googleDriveSync.lastSyncTime;
  public readonly isConnected = this.auth.isAuthenticated;
  public readonly isSyncing = computed(() => this.googleDriveSync.syncStatus() === 'syncing');

  public sync(): Promise<boolean> {
    return this.coordinator.syncNow();
  }

  public authenticate(): Promise<boolean> {
    return this.auth.login();
  }

  public logout(): void {
    this.auth.logout();
  }
}
