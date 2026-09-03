import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { A11yAuditor, FlowRecorder } from '@ibid/testing';

test.describe('User Journey 17: Multi-Page Accessibility (a11y) & Typography Audit', () => {
  test('executes automated a11y audit and font-size checks across all routes and dialogs', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '17-accessibility-audit');
    await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));

    await test.step('Audit Page 1: Dashboard View', async () => {
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.locator('.p-dashboard').first()).toBeVisible();
      await flow.step(1, 'audit-dashboard-page', 'dashboard-audited');
      await A11yAuditor.assertAccessible(page, 'Step 1 (audit-dashboard-page)');
    });

    await test.step('Audit Page 2: Movements View', async () => {
      await page.goto('/movements', { waitUntil: 'commit' });
      await expect(page.locator('.p-movements').first()).toBeVisible();
      await flow.step(2, 'audit-movements-page', 'movements-audited');
      await A11yAuditor.assertAccessible(page, 'Step 2 (audit-movements-page)');
    });

    await test.step('Audit Page 3: Budget View', async () => {
      await page.goto('/budget', { waitUntil: 'commit' });
      await expect(page.locator('.p-budget').first()).toBeVisible();
      await flow.step(3, 'audit-budget-page', 'budget-audited');
      await A11yAuditor.assertAccessible(page, 'Step 3 (audit-budget-page)');
    });

    await test.step('Audit Page 4: Portfolio View', async () => {
      await page.goto('/portfolio', { waitUntil: 'commit' });
      await expect(page.locator('.p-portfolio').first()).toBeVisible();
      await flow.step(4, 'audit-portfolio-page', 'portfolio-audited');
      await A11yAuditor.assertAccessible(page, 'Step 4 (audit-portfolio-page)');
    });

    await test.step('Audit Page 5: Database & Maintenance View', async () => {
      await page.goto('/database', { waitUntil: 'commit' });
      await expect(page.locator('.p-database').first()).toBeVisible();
      await flow.step(5, 'audit-database-page', 'database-audited');
      await A11yAuditor.assertAccessible(page, 'Step 5 (audit-database-page)');
    });

    await test.step('Audit Page 6: Navigation Sidenav Drawer', async () => {
      await page.goto('/', { waitUntil: 'commit' });
      const navBtn = page.locator('.o-header__action--nav');
      await expect(navBtn).toBeVisible();
      await navBtn.click();
      await page.waitForFunction(() => !!document.querySelector('.mat-drawer-opened'), undefined);
      await expect(page.locator('.m-sidenav-menu')).toBeVisible();
      await flow.step(6, 'audit-sidenav-drawer', 'sidenav-audited');
      await A11yAuditor.assertAccessible(page, 'Step 6 (audit-sidenav-drawer)');
    });
  });
});
