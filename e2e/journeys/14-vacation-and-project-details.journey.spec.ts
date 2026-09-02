import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 14: Vacation Projects and Detail Breakdown Bottom Sheet', () => {
  test('executes complete journey for vacation projects summary and opening vacation detail bottom sheet', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '14-vacation-and-project-details');

    await test.step('Step 1: Open budget page with pre-seeded projects', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/budget?startDate=2026-07-01&endDate=2026-07-31');
      await expect(page.locator('.p-budget')).toBeVisible({ timeout: 15000 });
      await flow.step(1, 'open-budget-page', 'budget-and-projects-rendered');
    });

    await test.step('Step 2: Inspect execution summary', async () => {
      const executionSummary = page.locator('ohsaveme-budget-execution-summary').first();
      await expect(executionSummary).toBeVisible({ timeout: 10000 });
      await flow.step(2, 'inspect-execution-summary', 'project-progress-visible');
    });

    await test.step('Step 3: Open vacation detail bottom sheet', async () => {
      const projectItem = page.locator('.m-budget-execution-summary__item--project, .m-budget-execution-summary__item').first();
      await expect(projectItem).toBeVisible({ timeout: 10000 });
      await projectItem.locator('button').first().click();

      const projectDialog = page.locator('.o-allocation-movements-dialog, .o-allocation-edit-dialog, .m-bottom-sheet-dialog').first();
      await expect(projectDialog).toBeVisible({ timeout: 10000 });
      await flow.step(3, 'open-vacation-detail-sheet', 'vacation-breakdown-rendered');

      const closeBtn = projectDialog.locator('button[aria-label*="Fechar"], button:has-text("Fechar"), button:has-text("Cancelar"), .o-bottom-sheet-dialog__close').first();
      await expect(closeBtn).toBeVisible({ timeout: 10000 });
      await closeBtn.click();
      await expect(projectDialog).not.toBeVisible({ timeout: 10000 });
      await flow.step(4, 'close-vacation-detail', 'vacation-sheet-dismissed');
    });
  });
});
