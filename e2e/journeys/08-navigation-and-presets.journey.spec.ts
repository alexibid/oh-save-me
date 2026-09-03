import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 08: Global Navigation, Header Controls and Presets', () => {
  test('executes complete journey for header controls, sidenav drawer, quick add, brand routing, presets, date picker and language switching', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '08-navigation-and-presets');

    await test.step('Step 1: Open home dashboard and assert header controls', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.locator('.p-dashboard')).toBeVisible();
      await expect(page.locator('.o-loading-curtain--visible')).not.toBeVisible();

      await expect(page.locator('.o-header__brand')).toBeVisible();
      await expect(page.locator('.o-header__action--nav')).toBeVisible();
      await expect(page.locator('.o-header__action--add')).toBeVisible();
      await expect(page.locator('.o-header__preset-dropdown')).toBeVisible();
      await expect(page.locator('.o-header__date-range')).toBeVisible();

      await flow.step(1, 'open-home-dashboard', 'dashboard-and-header-controls-rendered');
    });

    const navBtn = page.locator('.o-header__action--nav');
    await test.step('Step 2: Open and inspect sidenav drawer', async () => {
      await expect(navBtn).toBeVisible();
      await navBtn.click();
      const sidenavContainer = page.locator('.ohsaveme-sidenav, .o-sidenav__drawer');
      await expect(sidenavContainer).toBeVisible();
      await flow.step(2, 'open-navigation-sidenav', 'sidenav-drawer-opened');
    });

    await test.step('Step 3: Click Add Entry action from Sidenav', async () => {
      const addEntryLink = page.locator('.m-sidenav-menu__link').filter({ hasText: /Criar Conta|Importar Extrato/i }).first();
      await expect(addEntryLink).toBeVisible();
      await addEntryLink.click();

      const addEntryDialog = page.locator('.o-add-entry-dialog').first();
      await expect(addEntryDialog).toBeVisible();
      await flow.step(3, 'open-add-entry-from-sidenav', 'entry-choices-dialog-rendered');

      await addEntryDialog.getByRole('button', { name: /Cancelar|Fechar/i }).first().click();
      await expect(addEntryDialog).not.toBeVisible();
      await expect(page.locator('.cdk-overlay-backdrop')).not.toBeVisible();
    });

    await test.step('Step 4: Navigate to movements from sidenav', async () => {
      const sidenav = page.locator('.ohsaveme-sidenav');
      if (!(await sidenav.isVisible())) {
        await navBtn.click();
      }
      const movementsLink = page.locator('.m-sidenav-menu__link, a[href*="movements"]').filter({ hasText: /Movimentos/i }).first();
      await expect(movementsLink).toBeVisible();
      await movementsLink.click();
      await expect(page).toHaveURL(/movements/);
      await expect(page.locator('.p-movements')).toBeVisible();
      await flow.step(4, 'navigate-to-movements', 'movements-page-loaded-and-sidenav-closed');
    });

    await test.step('Step 5: Click Header Logo to return to dashboard', async () => {
      const brandLogo = page.locator('.o-header__brand');
      await expect(brandLogo).toBeVisible();
      await brandLogo.click();
      await expect(page).toHaveURL(/\//);
      await expect(page.locator('.p-dashboard')).toBeVisible();
      await flow.step(5, 'click-brand-logo', 'returned-to-dashboard-view');
    });

    await test.step('Step 6: Open Add Entry dialog via Header Quick Action', async () => {
      const addAction = page.locator('.o-header__action--add');
      await expect(addAction).toBeVisible();
      await addAction.click();

      const addEntryDialog = page.locator('.o-add-entry-dialog').first();
      await expect(addEntryDialog).toBeVisible();
      await flow.step(6, 'open-add-entry-from-header', 'entry-choices-dialog-rendered');

      await addEntryDialog.getByRole('button', { name: /Cancelar|Fechar/i }).first().click();
      await expect(addEntryDialog).not.toBeVisible();
      await expect(page.locator('.cdk-overlay-backdrop')).not.toBeVisible();
    });

    await test.step('Step 7: Change header date preset', async () => {
      const presetSelect = page.locator('.o-header__preset-dropdown').first();
      await expect(presetSelect).toBeVisible();
      await presetSelect.click();

      const presetOption = page.locator('.a-select__option, .a-select-field__option, mat-option').first();
      await expect(presetOption).toBeVisible();
      await presetOption.click();
      await flow.step(7, 'change-header-preset', 'date-range-and-data-updated');
    });

    await test.step('Step 8: Open and inspect Header Date Range picker', async () => {
      const dateRangeInput = page.locator('.o-header__date-range');
      await expect(dateRangeInput).toBeVisible();
      await dateRangeInput.click();
      await flow.step(8, 'open-date-range-picker', 'calendar-overlay-displayed');

      await page.keyboard.press('Escape');
    });

    await test.step('Step 9: Test contextual Header controls in assisted mode', async () => {
      await page.goto('/movements?insightId=active_subscriptions', { waitUntil: 'commit' });
      await expect(page.locator('.p-movements')).toBeVisible();

      const backBtn = page.locator('.o-header__back-to');
      await expect(backBtn).toBeVisible();
      await flow.step(9, 'inspect-contextual-header-controls', 'contextual-back-button-rendered');

      await backBtn.click();
      await expect(page).toHaveURL(/\//);
      await expect(page.locator('.p-dashboard')).toBeVisible();
      await flow.step(10, 'click-contextual-back-button', 'returned-to-dashboard');
    });

    const hasExpandableNav = testInfo.project.name !== 'desktop';

    await test.step('Step 10: Toggle language setting in Sidenav', async () => {
      test.skip(!hasExpandableNav, 'Expandable nav entries are hidden on desktop');
      await navBtn.click();
      const settingsBtn = page.locator('.m-sidenav-menu__footer .m-sidenav-menu__link--expandable').first();
      await expect(settingsBtn).toBeVisible();
      await settingsBtn.click();

      const langSelect = page.locator('.m-sidenav-menu__sub-menu ibid-select').first();
      await expect(langSelect).toBeVisible();
      await langSelect.click();

      const langOption = page.locator('.a-select-field__option, mat-option').first();
      await expect(langOption).toBeVisible();
      await langOption.click();
      await flow.step(11, 'toggle-language', 'language-switched');
    });
  });
});
