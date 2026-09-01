import { describe, it, expect, beforeEach } from 'vitest';
import { ShareAccessManagerComponent } from './share-access-manager';

describe('ShareAccessManagerComponent', () => {
  let component: ShareAccessManagerComponent;

  beforeEach(() => {
    localStorage.clear();
    component = new ShareAccessManagerComponent();
  });

  it('should initialize with default recipient', () => {
    expect(component.sharedUsers().length).toBeGreaterThan(0);
    expect(component.sharedUsers()[0].email).toBe('shared@example.com');
  });

  it('should toggle email selection and emit change', () => {
    let emitted: readonly string[] = [];
    component.selectedEmailsChange.subscribe(emails => {
      emitted = emails;
    });

    component.selectedEmails = [];
    component.toggleEmailSelection('shared@example.com');
    expect(emitted).toContain('shared@example.com');
  });

  it('should validate and add new recipient', () => {
    component.startAdding();
    expect(component.isAdding()).toBe(true);

    component.newEmail = 'novo.membro@gmail.com';
    component.addRecipient();

    expect(component.sharedUsers().some(u => u.email === 'novo.membro@gmail.com')).toBe(true);
    expect(component.isAdding()).toBe(false);
  });

  it('should reject invalid email on add', () => {
    component.startAdding();
    component.newEmail = 'invalid-email';
    component.addRecipient();

    expect(component.errorMessage()).toBe('Email inválido');
  });

  it('should remove recipient and update storage', () => {
    const mockEvent = { stopPropagation: () => {} } as unknown as MouseEvent;
    component.removeRecipient('shared@example.com', mockEvent);

    expect(component.sharedUsers().some(u => u.email === 'shared@example.com')).toBe(false);
  });
});
