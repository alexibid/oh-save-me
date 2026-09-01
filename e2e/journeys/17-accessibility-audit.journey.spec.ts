import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { A11yAuditor, FlowRecorder } from '@ibid/testing';

test.describe('User Journey 17: Multi-Page Accessibility (a11y) & Typography Audit', () => {
  test('executes automated a11y audit and font-size checks across all routes and dialogs', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '17-accessibility-audit');
    await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));

    await test.step('Audit Page 1: Dashboard View', async () => {
      await page.goto('/');
      await expect(page.locator('.p-dashboard').first()).toBeVisible({ timeout: 15000 });
      await flow.step(1, 'audit-dashboard-page', 'dashboard-audited');
      await A11yAuditor.assertAccessible(page, 'Step 1 (audit-dashboard-page)');
    });

    await test.step('Audit Page 2: Movements View', async () => {
      await page.goto('/movements');
      await expect(page.locator('.p-movements').first()).toBeVisible({ timeout: 15000 });
      await flow.step(2, 'audit-movements-page', 'movements-audited');
      await A11yAuditor.assertAccessible(page, 'Step 2 (audit-movements-page)');
    });

    await test.step('Audit Page 3: Budget View', async () => {
      await page.goto('/budget');
      await expect(page.locator('.p-budget').first()).toBeVisible({ timeout: 15000 });
      await flow.step(3, 'audit-budget-page', 'budget-audited');
      await A11yAuditor.assertAccessible(page, 'Step 3 (audit-budget-page)');
    });

    await test.step('Audit Page 4: Portfolio View', async () => {
      await page.goto('/portfolio');
      await expect(page.locator('.p-portfolio').first()).toBeVisible({ timeout: 15000 });
      await flow.step(4, 'audit-portfolio-page', 'portfolio-audited');
      await A11yAuditor.assertAccessible(page, 'Step 4 (audit-portfolio-page)');
    });

    await test.step('Audit Page 5: Database & Maintenance View', async () => {
      await page.goto('/database');
      await expect(page.locator('.p-database').first()).toBeVisible({ timeout: 15000 });
      await flow.step(5, 'audit-database-page', 'database-audited');
      await A11yAuditor.assertAccessible(page, 'Step 5 (audit-database-page)');
    });

    await test.step('Audit Page 6: Navigation Sidenav Drawer', async () => {
      await page.goto('/');
      const navBtn = page.locator('.o-header__action--nav');
      await expect(navBtn).toBeVisible({ timeout: 10000 });
      await navBtn.click();
      await page.waitForFunction(() => !!document.querySelector('.mat-drawer-opened'), undefined, { timeout: 10000 });
      await expect(page.locator('.m-sidenav-menu')).toBeVisible({ timeout: 10000 });
      await flow.step(6, 'audit-sidenav-drawer', 'sidenav-audited');
      await A11yAuditor.assertAccessible(page, 'Step 6 (audit-sidenav-drawer)');
    });
  });
});
