import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { ButtonComponent, IconComponent } from 'ibid-ui';
import { GoogleDriveSyncService } from '@ibid/services';
import { I18nService } from '@application/i18n.service';

export interface SharedUser {
  readonly email: string;
  readonly addedAt: string;
}

@Component({
  selector: 'ohsaveme-share-access-manager',
  standalone: true,
  imports: [
    FormsModule,
    IconComponent,
    ButtonComponent,
    AppTranslatePipe
],
  templateUrl: './share-access-manager.html',
  styleUrl: './share-access-manager.scss'
})
export class ShareAccessManagerComponent {
  private readonly i18n?: I18nService;
  private readonly STORAGE_KEY = 'savvy_shared_recipients';
  private readonly driveSync?: GoogleDriveSyncService;

  @Input() selectedEmails: readonly string[] = [];
  @Output() selectedEmailsChange = new EventEmitter<readonly string[]>();

  public readonly sharedUsers = signal<readonly SharedUser[]>([]);
  public readonly isAdding = signal<boolean>(false);
  public newEmail = '';
  public errorMessage = signal<string | null>(null);

  constructor() {
    try {
      this.i18n = inject(I18nService, { optional: true }) ?? undefined;
    } catch {
      this.i18n = undefined;
    }
    try {
      this.driveSync = inject(GoogleDriveSyncService, { optional: true }) ?? undefined;
    } catch {
      this.driveSync = undefined;
    }
    this.sharedUsers.set(this.loadRecipients());
  }

  private text(key: string, fallback: string): string {
    return this.i18n?.translate(key, fallback) ?? fallback;
  }

  private loadRecipients(): readonly SharedUser[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as readonly SharedUser[];
      }
    } catch {
      return [];
    }
    return [
      { email: 'shared@example.com', addedAt: new Date().toISOString() }
    ];
  }

  private saveRecipients(users: readonly SharedUser[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    }
    this.sharedUsers.set(users);
  }

  public toggleEmailSelection(email: string): void {
    const current = new Set(this.selectedEmails);
    if (current.has(email)) {
      current.delete(email);
    } else {
      current.add(email);
    }
    this.selectedEmailsChange.emit(Array.from(current));
  }

  public isSelected(email: string): boolean {
    return this.selectedEmails.includes(email);
  }

  public startAdding(): void {
    this.isAdding.set(true);
    this.newEmail = '';
    this.errorMessage.set(null);
  }

  public cancelAdding(): void {
    this.isAdding.set(false);
    this.newEmail = '';
    this.errorMessage.set(null);
  }

  public addRecipient(): void {
    const cleanEmail = this.newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      this.errorMessage.set(this.text('shareInvalidEmail', 'Invalid email'));
      return;
    }

    if (this.sharedUsers().some(u => u.email.toLowerCase() === cleanEmail)) {
      this.errorMessage.set('Esta conta já se encontra na lista');
      return;
    }

    const updated = [
      ...this.sharedUsers(),
      { email: cleanEmail, addedAt: new Date().toISOString() }
    ];
    this.saveRecipients(updated);

    const newSelected = [...this.selectedEmails, cleanEmail];
    this.selectedEmailsChange.emit(newSelected);

    if (this.driveSync) {
      void this.driveSync.findJointVaultFile().then(vault => {
        if (vault && !vault.isShared && this.driveSync) {
          void this.driveSync.shareFileWithUser(vault.id, cleanEmail);
        }
      });
      void this.driveSync.ensureAppFolders().then(folders => {
        if (folders?.sharedFolderId && this.driveSync) {
          void this.driveSync.shareFileWithUser(folders.sharedFolderId, cleanEmail);
        }
      });
    }

    this.isAdding.set(false);
    this.newEmail = '';
    this.errorMessage.set(null);
  }

  public removeRecipient(email: string, event: MouseEvent): void {
    event.stopPropagation();
    const updated = this.sharedUsers().filter(u => u.email !== email);
    this.saveRecipients(updated);

    const newSelected = this.selectedEmails.filter(e => e !== email);
    this.selectedEmailsChange.emit(newSelected);
  }
}
