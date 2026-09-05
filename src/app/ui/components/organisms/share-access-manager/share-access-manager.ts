import { Component, Input, Output, EventEmitter, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { ButtonComponent, IconComponent } from 'ibid-ui';

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
  private readonly STORAGE_KEY = 'savvy_shared_recipients';

  @Input() selectedEmails: readonly string[] = [];
  @Output() selectedEmailsChange = new EventEmitter<readonly string[]>();

  public readonly sharedUsers = signal<readonly SharedUser[]>([]);
  public readonly isAdding = signal<boolean>(false);
  public newEmail = '';
  public errorMessage = signal<string | null>(null);

  constructor() {
    this.sharedUsers.set(this.loadRecipients());
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
      this.errorMessage.set('Email inválido');
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
