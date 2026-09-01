import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 03: Filters, Search and Sum Mode', () => {
  test('executes complete journey for combined filters, search input and interactive sum calculation', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '03-filters-search-sum');

    await test.step('Step 1: Open movements page', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/movements?startDate=2026-07-01&endDate=2026-07-31');
      await expect(page.locator('.p-movements')).toBeVisible({ timeout: 15000 });
      await flow.step(1, 'open-movements', 'all-transactions-rendered');
    });

    const searchInput = page.locator('input[placeholder*="Pesquisar"]').first();
    await test.step('Step 2: Search for EDP records', async () => {
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      await searchInput.fill('EDP');
      await searchInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
      await flow.step(2, 'search-edp', 'filtered-to-edp-rows');
    });

    await test.step('Step 3: Clear search filter', async () => {
      const clearSearchBtn = page.locator('button[aria-label*="Limpar pesquisa"], .a-search-input__clear-btn').first();
      await expect(clearSearchBtn).toBeVisible({ timeout: 5000 });
      await clearSearchBtn.click();
      await expect(searchInput).toHaveValue('');
      await flow.step(3, 'clear-search', 'all-records-restored');
    });

    await test.step('Step 4: Enable sum mode and select rows', async () => {
      const sumToggle = page.locator('.o-transactions-table__sum-toggle-btn').first();
      await expect(sumToggle).toBeVisible({ timeout: 10000 });
      await sumToggle.click();
      await flow.step(4, 'enable-sum-mode', 'sum-mode-checkboxes-activated');

      const sumSelectAllContainer = page.locator('.p-movements__sum-select-all');
      await expect(sumSelectAllContainer).toBeVisible({ timeout: 5000 });

      const sumCheckboxes = page.locator('input.a-smart-icon-cell__checkbox');
      const count = await sumCheckboxes.count();
      expect(count).toBeGreaterThan(1);

      await sumCheckboxes.nth(0).click();
      await expect(sumCheckboxes.nth(0)).toBeChecked();
      await sumCheckboxes.nth(1).click();
      await expect(sumCheckboxes.nth(1)).toBeChecked();

      const sumDivider = page.locator('.o-transactions-table__sum-divider').first();
      await expect(sumDivider).toBeVisible({ timeout: 5000 });
      await flow.step(5, 'select-two-rows-for-sum', 'sum-checkboxes-selected');
    });
  });
});
