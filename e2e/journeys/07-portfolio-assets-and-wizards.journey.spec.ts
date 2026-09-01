import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 07: Portfolio Assets, Allocation Wizard and Movements Dialog', () => {
  test('executes complete journey for portfolio overview, asset creation wizard and asset movements bottom sheet', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '07-portfolio-assets-and-wizards');

    await test.step('Step 1: Open portfolio page and assert asset cards', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/portfolio');
      await expect(page.locator('.p-portfolio')).toBeVisible({ timeout: 15000 });

      const assetCard = page.locator('.m-allocation-detailed-cards__card').first();
      await expect(assetCard).toBeVisible({ timeout: 10000 });
      await flow.step(1, 'open-portfolio-page', 'assets-cards-and-balance-rendered');
    });

    await test.step('Step 2: Open asset movements bottom sheet and switch to available tab', async () => {
      const movementsBtn = page.locator('.m-allocation-detailed-cards__movements-btn').first();
      await expect(movementsBtn).toBeVisible({ timeout: 10000 });
      await movementsBtn.click();

      const movementsSheet = page.locator('.c-allocation-dialog, .m-bottom-sheet-dialog').first();
      await expect(movementsSheet).toBeVisible({ timeout: 10000 });
      await flow.step(2, 'open-asset-movements-sheet', 'asset-linked-movements-rendered');

      const availableTab = movementsSheet.locator('.c-allocation-dialog__tab').nth(1);
      await expect(availableTab).toBeVisible({ timeout: 10000 });
      await availableTab.click();
      await flow.step(3, 'switch-to-available-tab', 'available-movements-or-search-prompt-rendered');

      const searchInput = movementsSheet.locator('.c-allocation-dialog__search input, .a-search-input__field').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      await searchInput.fill('Habitação');
      await searchInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
      await flow.step(4, 'search-historical-movements', 'filtered-historical-transactions-listed');

      const closeSheetBtn = movementsSheet.locator('button[aria-label*="Fechar"], .m-bottom-sheet-dialog__close, .o-bottom-sheet-dialog__close').first();
      await expect(closeSheetBtn).toBeVisible({ timeout: 10000 });
      await closeSheetBtn.click();
      await expect(movementsSheet).not.toBeVisible({ timeout: 10000 });
      await flow.step(5, 'close-asset-movements-sheet', 'movements-sheet-dismissed');
    });

    await test.step('Step 3: Open asset creation wizard', async () => {
      const addAssetBtn = page.locator('.m-budget-actions-banner__btn, .m-budget-actions-banner button').first();
      await expect(addAssetBtn).toBeVisible({ timeout: 10000 });
      await addAssetBtn.click();

      const allocationWizard = page.locator('.m-allocation-wizard').first();
      await expect(allocationWizard).toBeVisible({ timeout: 15000 });
      await flow.step(6, 'open-asset-creation-wizard', 'wizard-bottom-sheet-rendered');

      const nameInput = allocationWizard.locator('input[type="text"], input.a-input').first();
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      await nameInput.fill('Apartamento T2');
      await nameInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));

      const closeWizardBtn = allocationWizard.locator('button[aria-label*="Fechar"], button:has-text("Cancelar"), .m-bottom-sheet-dialog__close, .o-bottom-sheet-dialog__close').first();
      await expect(closeWizardBtn).toBeVisible({ timeout: 10000 });
      await closeWizardBtn.click();
      await expect(allocationWizard).not.toBeVisible({ timeout: 10000 });
      await flow.step(7, 'close-asset-wizard', 'wizard-closed');
    });
  });
});
