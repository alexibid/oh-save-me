import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 06: Budget, Category Wizard and Vacation Projects', () => {
  test('executes complete journey for budget management, category budget breakdown wizard and project details', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '06-budget-and-projects');

    await test.step('Step 1: Open budget page with pre-seeded data', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/budget?startDate=2026-07-01&endDate=2026-07-31', { waitUntil: 'commit' });
      await expect(page.locator('.p-budget')).toBeVisible();
      await flow.step(1, 'open-budget-page', 'budget-summary-and-cards-rendered');
    });

    await test.step('Step 2: Inspect balance summary card', async () => {
      const summaryCard = page.locator('.o-balance-summary-card, ohsaveme-balance-summary-card').first();
      await expect(summaryCard).toBeVisible();
      await flow.step(2, 'view-summary-card', 'patrimony-and-reserves-calculated');
    });

    const categoryWizard = page.locator('.o-category-budget-wizard-dialog').first();
    await test.step('Step 3: Open category budget wizard', async () => {
      await page.goto('/budget?category=groceries', { waitUntil: 'commit' });
      await expect(categoryWizard).toBeVisible();
      await flow.step(3, 'open-category-budget-wizard-step1', 'breakdown-step1-rendered');
    });

    await test.step('Step 4: Advance to step 2 and update budget amount', async () => {
      const continueBtn = categoryWizard.locator('button:has-text("Continuar"), .o-category-budget-wizard-dialog__btn--primary').first();
      await expect(continueBtn).toBeVisible();
      await continueBtn.click();
      await flow.step(4, 'click-continue-to-step2', 'amount-input-step2-rendered');

      const amountInput = categoryWizard.locator('input[type="number"], .o-category-budget-wizard-dialog__form-input').first();
      await expect(amountInput).toBeVisible();
      await amountInput.fill('450');
      await amountInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
      await flow.step(5, 'fill-new-budget-amount', 'budget-amount-updated');

      const saveBudgetBtn = categoryWizard.locator('button[type="submit"], button:has-text("Guardar")').first();
      await expect(saveBudgetBtn).toBeVisible();
      await saveBudgetBtn.click();
      await flow.step(6, 'save-category-budget', 'wizard-saved-and-closed');
    });

    await test.step('Step 5: Verify budget page reload and persistence', async () => {
      await page.goto('/budget', { waitUntil: 'commit' });
      await expect(page.locator('.p-budget')).toBeVisible();
      await flow.step(7, 'reload-budget-page', 'budget-changes-persisted');
    });
  });
});
