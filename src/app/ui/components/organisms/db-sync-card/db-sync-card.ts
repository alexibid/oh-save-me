import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { GoogleAuthService } from '@infrastructure/sync/google-auth.service';
import { GoogleDriveSyncService } from '@ibid/services';
import { DriveSyncCoordinatorService } from '@application/services/drive-sync-coordinator.service';
import { I18nService } from '@application/i18n.service';
import { ButtonComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-db-sync-card',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    IconComponent,
    AppTranslatePipe
  ],
  styleUrl: './db-sync-card.scss',
  templateUrl: './db-sync-card.html'
})
export class DbSyncCardComponent {
  protected readonly auth = inject(GoogleAuthService);
  protected readonly driveSync = inject(GoogleDriveSyncService);
  protected readonly coordinator = inject(DriveSyncCoordinatorService);
  protected readonly i18n = inject(I18nService);

  public readonly isConnected = this.auth.isAuthenticated;
  public readonly isConnecting = computed(() => this.auth.status() === 'connecting');
  public readonly isSyncing = computed(() => this.driveSync.syncStatus() === 'syncing');
  public readonly activeVault = this.driveSync.activeVaultFile;
  public readonly activePrivateVault = this.driveSync.activePrivateVault;
  public readonly activeJointVault = this.driveSync.activeJointVault;
  public readonly lastSyncTime = this.driveSync.lastSyncTime;
  public readonly errorMessage = computed(() => this.auth.errorMessage() ?? this.driveSync.errorMessage());

  public async onConnect(): Promise<void> {
    await this.auth.login();
    if (this.auth.isAuthenticated()) {
      await this.coordinator.syncNow();
    }
  }

  public onDisconnect(): void {
    this.auth.logout();
    this.driveSync.syncStatus.set('disconnected');
  }

  public async onSyncNow(): Promise<void> {
    await this.coordinator.syncNow();
  }
}
