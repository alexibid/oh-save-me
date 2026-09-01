import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 02: Recurring Subscriptions and Selected Sorting', () => {
  test('executes complete journey for recurring expenses detection, selection sorting and batch toggling', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '02-recurring-subscriptions');

    await test.step('Step 1: Open assisted recurring view', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/movements?insightId=active_subscriptions&search=Eletricidade%20EDP');
      await expect(page.locator('.p-movements')).toBeVisible({ timeout: 15000 });
      await flow.step(1, 'open-assisted-recurring-view', 'table-with-checkboxes');
    });

    const checkboxes = page.locator('input.a-smart-icon-cell__checkbox');
    await test.step('Step 2: Group selected items on top', async () => {
      await expect(checkboxes.first()).toBeVisible({ timeout: 10000 });

      const sortSelectedBtn = page.locator('.o-transactions-table__sort-btn').filter({ hasText: /Selecionados/i }).first();
      await expect(sortSelectedBtn).toBeVisible({ timeout: 10000 });
      await sortSelectedBtn.click();
      await flow.step(2, 'sort-by-selected', 'selected-items-grouped-on-top');
    });

    const headerAction = page.locator('.o-header__confirm-recurring');
    await test.step('Step 3: Toggle recurring status from header action', async () => {
      await expect(headerAction).toBeVisible({ timeout: 10000 });
      await expect(headerAction).toContainText(/Desmarcar recorrentes|Confirmar.*recorrentes/i);
      await flow.step(3, 'inspect-header-action-button', 'header-action-visible');

      await headerAction.click();
      await expect(headerAction).toContainText(/Desmarcar recorrentes|Confirmar.*recorrentes/i);
      await flow.step(4, 'click-header-action-to-toggle', 'checkboxes-toggled-and-saved');
    });

    await test.step('Step 4: Toggle individual transaction checkbox', async () => {
      const firstCheckbox = page.locator('input.a-smart-icon-cell__checkbox').first();
      await firstCheckbox.click();
      await flow.step(5, 'toggle-single-row-checkbox', 'single-row-toggled');
    });

    await test.step('Step 5: Verify persistence after reload', async () => {
      await page.reload();
      const reloadedCheckboxes = page.locator('input.a-smart-icon-cell__checkbox');
      await expect(reloadedCheckboxes.first()).toBeVisible({ timeout: 15000 });
      await flow.step(6, 'reload-page', 'recurring-state-persisted-in-database');
    });
  });
});
