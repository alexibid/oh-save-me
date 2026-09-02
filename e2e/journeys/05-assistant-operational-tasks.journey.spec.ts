import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 05: Floating Assistant and Operational Tasks', () => {
  test('executes complete journey for floating assistant interaction and operational tasks resolution', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '05-assistant-operational-tasks');

    await test.step('Step 1: Load dashboard and assert assistant FAB', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/');
      await expect(page.locator('.p-dashboard')).toBeVisible({ timeout: 15000 });

      const assistantFab = page.locator('ibid-fab, .o-assistant-fab, button[aria-label*="Assistente"]').first();
      await expect(assistantFab).toBeVisible({ timeout: 10000 });
      await flow.step(1, 'view-dashboard-fab', 'assistant-fab-visible-on-dashboard');
      await assistantFab.click();
    });

    const assistantSheet = page.locator('.m-bottom-sheet-dialog--assistant').first();
    const frontCard = assistantSheet.locator('.m-assistant-peek-card--front, .m-assistant-peek-card').first();

    await test.step('Step 2: Inspect open assistant peek deck', async () => {
      await expect(assistantSheet).toBeVisible({ timeout: 10000 });
      await expect(frontCard).toBeVisible({ timeout: 10000 });
      const cardTitle = frontCard.locator('.m-assistant-peek-card__label').first();
      await expect(cardTitle).toBeVisible({ timeout: 5000 });
      await flow.step(2, 'open-assistant-peek-deck', 'peek-deck-rendered-with-tasks');
    });

    await test.step('Step 3: Inspect peek card details and dismissal control', async () => {
      const dismissBtn = frontCard.locator('ibid-dismiss-button, button[aria-label*="Fechar"], button[aria-label*="Dispensar"]').first();
      await expect(dismissBtn).toBeVisible({ timeout: 5000 });
      await flow.step(3, 'inspect-peek-card-details', 'task-details-and-dismissal-visible');
    });

    await test.step('Step 4: Close assistant deck returning to FAB', async () => {
      const closeAssistantBtn = assistantSheet.locator('button[aria-label*="Fechar"], .o-assistant-stack__close, .m-bottom-sheet-dialog__close').first();
      await expect(closeAssistantBtn).toBeVisible({ timeout: 10000 });
      await closeAssistantBtn.click();
      await expect(assistantSheet).not.toBeVisible({ timeout: 10000 });
      await flow.step(4, 'close-assistant-deck', 'assistant-collapsed-to-fab');
    });
  });
});
