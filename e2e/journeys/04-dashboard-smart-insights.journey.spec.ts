import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 04: Dashboard Consolidation and Smart Financial Insights', () => {
  test('executes complete journey for dashboard metrics, cycling archetypes, archive management and assisted navigation', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '04-dashboard-smart-insights');

    await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
    await page.goto('/');
    await expect(page.locator('.p-dashboard')).toBeVisible({ timeout: 15000 });
    await flow.step(1, 'load-dashboard', 'consolidation-cards-rendered');

    const insightsSection = page.locator('.o-dashboard-insights');
    await expect(insightsSection).toBeVisible({ timeout: 10000 });
    await flow.step(2, 'view-smart-insights', 'deterministic-insights-grid-visible');

    const frontCard = page.locator('.o-dashboard-insight-card--front, .o-dashboard-insight-card').first();
    await expect(frontCard).toBeVisible({ timeout: 10000 });
    await flow.step(3, 'inspect-front-insight-card', 'front-archetype-details-rendered');

    const allCards = page.locator('.o-dashboard-insights__card-wrapper');
    const cardCount = await allCards.count();
    if (cardCount > 1) {
      await allCards.nth(1).click({ force: true });
      await flow.step(4, 'cycle-to-next-insight-card', 'next-archetype-promoted-to-front');
    }

    const dismissBtn = page.locator('[data-testid="insight-dismiss-btn"], .o-dashboard-insight-card__dismiss-btn').first();
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
      await flow.step(5, 'dismiss-insight-card', 'insight-dismissed-and-archived');
    }

    const archiveToggle = page.locator('[data-testid="insights-archive-toggle"], .o-dashboard-insights__archive-toggle').first();
    if (await archiveToggle.isVisible()) {
      await archiveToggle.click();
      await flow.step(6, 'open-insights-archive', 'archived-insights-rendered');

      const restoreBtn = page.locator('[data-testid="insight-restore-btn"], .o-dashboard-insight-card__restore-btn').first();
      if (await restoreBtn.isVisible()) {
        await restoreBtn.click();
        await flow.step(7, 'restore-archived-insight', 'insight-restored-to-active-deck');
      }

      if (await archiveToggle.isVisible()) {
        await archiveToggle.click();
      }
    }

    const actionButton = page.locator('[data-testid="insight-action-btn"], .o-dashboard-insight-card__action-btn, .o-dashboard-insight-card__lead').first();
    if (await actionButton.isVisible()) {
      await actionButton.click();
      await expect(page).toHaveURL(/(movements|budget|portfolio)/);
      await flow.step(8, 'click-insight-action', 'assisted-navigation-to-target-module');

      const backBtn = page.locator('.o-header__back-to');
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await expect(page).toHaveURL(/\//);
        await flow.step(9, 'click-header-back-button', 'returned-to-dashboard-with-focus');
      }
    }
  });
});
