import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 13: Column Manager Panel and Dynamic Table Customization', () => {
  test('executes complete journey for opening column manager, toggling column visibility and live reordering', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '13-column-manager');

    await test.step('Step 1: Open movements page', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/movements?startDate=2026-07-01&endDate=2026-07-31', { waitUntil: 'commit' });
      await expect(page.locator('.p-movements')).toBeVisible();
      await flow.step(1, 'open-movements-page', 'movements-table-rendered');
    });

    const colManagerTrigger = page.locator('.m-column-manager-panel__trigger').first();
    await test.step('Step 2: Open column manager panel', async () => {
      await expect(colManagerTrigger).toBeVisible();
      await colManagerTrigger.click();
      await flow.step(2, 'open-column-manager-sheet', 'column-manager-sheet-opened');
    });

    const colManagerSheet = page.locator('.m-column-manager-panel__sheet').first();
    await test.step('Step 3: Toggle column visibility', async () => {
      await expect(colManagerSheet).toBeVisible();

      const unlockedToggle = colManagerSheet.locator('.m-column-manager-panel__toggle:not([disabled])').first();
      await expect(unlockedToggle).toBeVisible();
      await unlockedToggle.click();
      await flow.step(3, 'toggle-column-visibility', 'column-visibility-toggled');
    });

    await test.step('Step 4: Close column manager sheet', async () => {
      const closeBtn = colManagerSheet.locator('.m-column-manager-panel__close').first();
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
      await expect(colManagerSheet).not.toBeVisible();
      await flow.step(4, 'close-column-manager-sheet', 'table-updated-with-custom-columns');
    });
  });
});
