import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 01: Categorization and Batch ML Rules', () => {
  test('executes complete journey for assigning project, category and batch rules with persistence', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '01-categorization-and-rules');

    await test.step('Step 1: Open movements page with pre-seeded data', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/movements?startDate=2026-07-01&endDate=2026-07-31', { waitUntil: 'commit' });
      await expect(page.locator('.p-movements')).toBeVisible();
      await flow.step(1, 'open-movements', 'table-rendered');
    });

    await test.step('Step 2: Search for Continente transactions', async () => {
      const searchInput = page.locator('input[placeholder*="Pesquisar"]').first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Supermercado Continente');
      await searchInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
      await flow.step(2, 'search-continente', 'matching-rows-filtered');
    });

    const firstCell = page.locator('ibid-smart-budget-cell').first();
    await test.step('Step 3: Open category/project dropdown in budget cell', async () => {
      await expect(firstCell).toBeVisible();
      await firstCell.click();
      await flow.step(3, 'click-budget-cell', 'dropdown-menu-opened');
    });

    await test.step('Step 4: Select Vacation project in multi-select', async () => {
      const projectOption = page.locator('.m-searchable-select__option--project').filter({ hasText: 'Férias de Verão' }).first();
      await expect(projectOption).toBeVisible();
      await projectOption.click();
      await flow.step(4, 'select-project-ferias', 'project-badge-previewed');
    });

    await test.step('Step 5: Select Meals category triggering ML confirmation', async () => {
      const categoryOption = page.locator('.m-searchable-select__option').filter({ hasText: /Refeições/i }).first();
      await expect(categoryOption).toBeVisible();
      await categoryOption.click();
      await flow.step(5, 'select-category-refeicoes', 'ml-confirmation-dialog-opened');
    });

    const dialog = page.locator('.o-ml-confirmation-dialog');
    await test.step('Step 6: Inspect batch ML rules dialog', async () => {
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('.o-ml-confirmation-dialog__help-text')).toContainText('Refeições e Bares');

      const dialogCheckboxes = dialog.locator('input.a-smart-icon-cell__checkbox');
      const checkboxCount = await dialogCheckboxes.count();
      expect(checkboxCount).toBeGreaterThan(0);
      await expect(dialogCheckboxes.first()).toBeChecked();
      await flow.step(6, 'inspect-ml-dialog', 'similar-txs-with-checkboxes');
    });

    await test.step('Step 7: Confirm batch ML rule', async () => {
      const confirmRuleBtn = page.getByRole('button', { name: /Confirmar e Aplicar Regra/i }).first();
      await expect(confirmRuleBtn).toBeVisible();
      await confirmRuleBtn.click();
      await expect(dialog).not.toBeVisible();
      await flow.step(7, 'confirm-batch-rule', 'dialog-closed-table-updated');

      await expect(firstCell).toHaveText(/Férias de Verão/);
      await expect(firstCell).toHaveText(/Refeições/i);
    });

    await test.step('Step 8: Reload page and verify persistence', async () => {
      await page.reload();
      const reloadedSearch = page.locator('input[placeholder*="Pesquisar"]').first();
      await expect(reloadedSearch).toBeVisible();
      await reloadedSearch.fill('Supermercado Continente');
      await reloadedSearch.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));

      const reloadedFirstCell = page.locator('ibid-smart-budget-cell').first();
      await expect(reloadedFirstCell).toHaveText(/Férias de Verão/);
      await expect(reloadedFirstCell).toHaveText(/Refeições/i);
      await flow.step(8, 'reload-page', 'changes-persisted-in-database');
    });
  });
});
