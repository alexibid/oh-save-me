import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 08: Global Navigation, Presets and Language Toggle', () => {
  test('executes complete journey for sidenav navigation, date presets and language switching', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '08-navigation-and-presets');

    await test.step('Step 1: Open home dashboard', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/');
      await expect(page.locator('.p-dashboard')).toBeVisible({ timeout: 15000 });
      await flow.step(1, 'open-home-dashboard', 'dashboard-rendered');
    });

    const navBtn = page.locator('.o-header__action--nav');
    await test.step('Step 2: Open sidenav drawer', async () => {
      await expect(navBtn).toBeVisible({ timeout: 10000 });
      await navBtn.click();
      await flow.step(2, 'open-navigation-sidenav', 'sidenav-drawer-opened');
    });

    await test.step('Step 3: Navigate to movements from sidenav', async () => {
      const movementsLink = page.locator('.m-sidenav-menu__link, a[href*="movements"]').filter({ hasText: /Movimentos/i }).first();
      await expect(movementsLink).toBeVisible({ timeout: 10000 });
      await movementsLink.click();
      await expect(page).toHaveURL(/movements/);
      await flow.step(3, 'navigate-to-movements', 'movements-page-loaded-and-sidenav-closed');
    });

    await test.step('Step 4: Cycle header date preset', async () => {
      const presetSelect = page.locator('.o-header__preset-dropdown, .o-header__cycle-preset').first();
      await expect(presetSelect).toBeVisible({ timeout: 10000 });
      await presetSelect.click();

      const presetOption = page.locator('.a-select__option, mat-option').first();
      await expect(presetOption).toBeVisible({ timeout: 5000 });
      await presetOption.click();
      await flow.step(4, 'change-header-preset', 'date-range-and-data-updated');
    });

    const hasExpandableNav = testInfo.project.name !== 'desktop';

    await test.step('Step 5: Toggle language setting', async () => {
      test.skip(!hasExpandableNav, 'Expandable nav entries are hidden on desktop');
      await navBtn.click();
      const settingsBtn = page.locator('.m-sidenav-menu__footer .m-sidenav-menu__link--expandable').first();
      await expect(settingsBtn).toBeVisible({ timeout: 10000 });
      await settingsBtn.click();

      const langSelect = page.locator('.m-sidenav-menu__sub-menu ibid-select').first();
      await expect(langSelect).toBeVisible({ timeout: 10000 });
      await langSelect.click();

      const langOption = page.locator('.a-select-field__option, mat-option').first();
      await expect(langOption).toBeVisible({ timeout: 5000 });
      await langOption.click();
      await flow.step(5, 'toggle-language', 'language-switched');
    });
  });
});
