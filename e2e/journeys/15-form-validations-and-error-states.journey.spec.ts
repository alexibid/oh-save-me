import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 15: Form Validations and Disabled Error States', () => {
  test('executes negative journey validating disabled submit buttons on empty inputs across dialogs', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '15-form-validations-and-error-states');

    await test.step('Step 1: Open account creation dialog and test empty name validation', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.locator('.p-dashboard')).toBeVisible();
      await expect(page.locator('.o-loading-curtain--visible')).not.toBeVisible();

      const navBtn = page.locator('.o-header__action--nav');
      await expect(navBtn).toBeVisible();
      await navBtn.click();

      const addAccountAction = page.locator('.m-sidenav-menu__link').filter({ hasText: /Criar Conta|Importar Extrato/i }).first();
      await expect(addAccountAction).toBeVisible();
      await addAccountAction.click();

      const addEntryDialog = page.locator('.o-add-entry-dialog').first();
      await expect(addEntryDialog).toBeVisible();

      const createAccountBtn = addEntryDialog.locator('.o-add-entry-dialog__choice').first();
      await expect(createAccountBtn).toBeVisible();
      await createAccountBtn.click();

      const accountWizard = page.locator('.o-account-create-dialog, .o-bottom-sheet-dialog').first();
      await expect(accountWizard).toBeVisible();

      const continueBtn = accountWizard.locator('button:has-text("Continuar"), button:has-text("Avançar"), .a-button--primary').first();
      await expect(continueBtn).toBeVisible();
      await continueBtn.click();

      const confirmBtn = accountWizard.locator('button:has-text("Confirmar"), button:has-text("Criar"), .a-button--primary').first();
      await expect(confirmBtn).toBeVisible();
      await expect(confirmBtn).toBeDisabled();
      await flow.step(1, 'account-dialog-empty-name', 'confirm-button-disabled');

      const nameInput = accountWizard.locator('input.o-account-create-dialog__input').first();
      await nameInput.fill('Conta Válida');
      await nameInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
      await expect(confirmBtn).toBeEnabled();
      await flow.step(2, 'account-dialog-filled-name', 'confirm-button-enabled');

      const cancelBtn = accountWizard.locator('button:has-text("Cancelar"), button[aria-label*="Fechar"], .o-bottom-sheet-dialog__close').first();
      await cancelBtn.click();
      await expect(accountWizard).not.toBeVisible();
    });

    await test.step('Step 2: Open category management and test form validation', async () => {
      await page.goto('/categories/manage', { waitUntil: 'commit' });
      await expect(page.locator('.p-categories')).toBeVisible();

      const submitCategoryBtn = page.locator('.p-categories__form-actions button[type="submit"]').first();
      await expect(submitCategoryBtn).toBeVisible();
      await expect(submitCategoryBtn).toBeDisabled();
      await flow.step(3, 'category-form-empty', 'submit-button-disabled');

      const catNameInput = page.locator('#catName, input[name="formName"]').first();
      await catNameInput.fill('Nova Categoria Teste');
      await catNameInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
      await expect(submitCategoryBtn).toBeEnabled();
      await flow.step(4, 'category-form-filled', 'submit-button-enabled');
    });

    await test.step('Step 3: Open allocation wizard and test empty budget validation', async () => {
      await page.goto('/budget?new=true', { waitUntil: 'commit' });
      const allocationWizard = page.locator('.m-allocation-wizard, .m-bottom-sheet-dialog').first();
      await expect(allocationWizard).toBeVisible();

      const submitBudgetBtn = allocationWizard.locator('[sheet-footer] ibid-button[variant="primary"] button, button:has-text("Criar")').first();
      await expect(submitBudgetBtn).toBeVisible();
      await expect(submitBudgetBtn).toBeDisabled();
      await flow.step(5, 'allocation-wizard-empty', 'submit-button-disabled');

      const nameInput = allocationWizard.locator('input[name="budgetName"], input[type="text"]').first();
      await nameInput.fill('Projeto Férias Válido');
      await nameInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));

      const amountInput = allocationWizard.locator('input[name="budgetAmount"], input[type="number"]').first();
      await amountInput.fill('500');
      await amountInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));

      await expect(submitBudgetBtn).toBeEnabled();
      await flow.step(6, 'allocation-wizard-filled', 'submit-button-enabled');

      const closeWizardBtn = allocationWizard.locator('[sheet-footer] ibid-button[variant="outlined"] button, button[aria-label*="Fechar"], .o-bottom-sheet-dialog__close').first();
      await closeWizardBtn.click();
      await expect(allocationWizard).not.toBeVisible();
      await flow.step(7, 'close-allocation-wizard', 'wizard-dismissed-cleanly');
    });
  });
});
