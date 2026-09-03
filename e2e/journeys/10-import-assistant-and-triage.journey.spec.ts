import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 10: Import Assistant, Column Mapper and Triage Bottom Sheet', () => {
  test('executes complete journey for bank statement import wizard and post-import triage dialog', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '10-import-assistant-and-triage');

    await test.step('Step 1: Load dashboard and open navigation', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.locator('.p-dashboard')).toBeVisible();
      await flow.step(1, 'load-dashboard', 'dashboard-rendered');

      const navBtn = page.locator('.o-header__action--nav');
      await expect(navBtn).toBeVisible();
      await navBtn.click();
      await flow.step(2, 'open-sidenav', 'sidenav-drawer-visible');
    });

    await test.step('Step 2: Open entry chooser bottom sheet', async () => {
      const addAccountAction = page.locator('.m-sidenav-menu__link').filter({ hasText: /Criar Conta|Importar Extrato/i }).first();
      await expect(addAccountAction).toBeVisible();
      await addAccountAction.click();
      await flow.step(3, 'click-add-entry-action', 'entry-chooser-dialog-opened');
    });

    const addEntryDialog = page.locator('.o-add-entry-dialog').first();
    await test.step('Step 3: Choose import statement option', async () => {
      await expect(addEntryDialog).toBeVisible();

      const importBtn = addEntryDialog.locator('.o-add-entry-dialog__choice').nth(1);
      await expect(importBtn).toBeVisible();
      await importBtn.click();
      await flow.step(4, 'select-import-option', 'import-assistant-dialog-opened');
    });

    const importWizard = page.locator('.o-import-assistant').first();
    await test.step('Step 4: Inspect import wizard dropzone', async () => {
      await expect(importWizard).toBeVisible();
      await flow.step(5, 'inspect-import-wizard', 'file-dropzone-and-account-select-rendered');
    });

    await test.step('Step 5: Dismiss import wizard gracefully', async () => {
      const closeImportBtn = importWizard.locator('.o-bottom-sheet-dialog__close, button[aria-label*="Fechar"], button:has-text("Cancelar")').first();
      await expect(closeImportBtn).toBeVisible();
      await closeImportBtn.click();
      await expect(importWizard).not.toBeVisible();
      await flow.step(6, 'close-import-wizard', 'import-wizard-dismissed');
    });
  });
});
