import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 09: Account Creation and Add Entry Bottom Sheet', () => {
  test('executes complete journey for creating accounts via global entry chooser and account wizard dialog', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '09-account-creation-and-management');

    await test.step('Step 1: Load dashboard and open navigation', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.locator('.p-dashboard')).toBeVisible();
      await flow.step(1, 'load-home-page', 'dashboard-rendered');

      const navBtn = page.locator('.o-header__action--nav');
      await expect(navBtn).toBeVisible();
      await navBtn.click();
      await flow.step(2, 'open-sidenav', 'sidenav-drawer-visible');
    });

    await test.step('Step 2: Open entry chooser bottom sheet', async () => {
      const addAccountAction = page.locator('.m-sidenav-menu__link').filter({ hasText: /Criar Conta|Importar Extrato/i }).first();
      await expect(addAccountAction).toBeVisible();
      await addAccountAction.click();
      await flow.step(3, 'click-add-entry-action', 'entry-chooser-bottom-sheet-opened');
    });

    const addEntryDialog = page.locator('.o-add-entry-dialog').first();
    await test.step('Step 3: Choose create account option', async () => {
      await expect(addEntryDialog).toBeVisible();

      const createAccountBtn = addEntryDialog.locator('.o-add-entry-dialog__choice').first();
      await expect(createAccountBtn).toBeVisible();
      await createAccountBtn.click();
      await flow.step(4, 'select-create-account-option', 'account-create-wizard-step1-opened');
    });

    const accountWizard = page.locator('.o-account-create-dialog, .o-bottom-sheet-dialog').first();
    await test.step('Step 4: Advance to account details step', async () => {
      await expect(accountWizard).toBeVisible();

      const continueBtn = accountWizard.locator('button:has-text("Continuar"), button:has-text("Avançar"), .a-button--primary').first();
      await expect(continueBtn).toBeVisible();
      await continueBtn.click();
      await flow.step(5, 'continue-to-account-details-step2', 'step2-details-rendered');
    });

    await test.step('Step 5: Fill account details and submit', async () => {
      const nameInput = accountWizard.locator('input.o-account-create-dialog__input').first();
      await expect(nameInput).toBeVisible();
      await nameInput.fill('Conta ActivoBank');
      await nameInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));

      const confirmBtn = accountWizard.locator('button:has-text("Confirmar"), button:has-text("Criar"), .a-button--primary').first();
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();
      await expect(accountWizard).not.toBeVisible();
      await flow.step(6, 'submit-new-account', 'account-created-and-dialog-closed');
    });

    await test.step('Step 6: Verify persistence after reload', async () => {
      await page.reload();
      await expect(page.locator('.p-dashboard')).toBeVisible();
      await flow.step(7, 'reload-dashboard', 'account-persisted-in-database');
    });
  });
});
