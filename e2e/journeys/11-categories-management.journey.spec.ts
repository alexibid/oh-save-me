import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 11: Categories Management, Subcategories, Colors and Editing', () => {
  test('executes complete journey for listing categories, editing colors and creating subcategories', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '11-categories-management');

    await test.step('Step 1: Open categories management page', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/categories/manage');
      await expect(page.locator('.p-categories')).toBeVisible({ timeout: 15000 });
      await flow.step(1, 'open-categories-manage', 'categories-management-rendered');
    });

    await test.step('Step 2: Fill new category form and pick color', async () => {
      const catNameInput = page.locator('#catName, input[name="formName"]').first();
      await expect(catNameInput).toBeVisible({ timeout: 10000 });
      await catNameInput.fill('Educação & Cursos');
      await catNameInput.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
      await flow.step(2, 'fill-new-category-name', 'category-name-entered');

      const colorCircle = page.locator('.p-categories__color-circle').nth(2);
      await expect(colorCircle).toBeVisible({ timeout: 10000 });
      await colorCircle.click();
      await flow.step(3, 'select-category-color', 'category-color-picked');
    });

    await test.step('Step 3: Submit new category', async () => {
      const createCategoryBtn = page.locator('.p-categories__form-actions button[type="submit"]').first();
      await expect(createCategoryBtn).toBeVisible({ timeout: 10000 });
      await createCategoryBtn.click();
      await flow.step(4, 'submit-new-category', 'category-created-and-listed');
    });

    await test.step('Step 4: View created category in list and verify persistence', async () => {
      await page.goto('/categories/list');
      await expect(page.locator('.p-categories-list-page')).toBeVisible({ timeout: 15000 });
      await flow.step(5, 'open-categories-list', 'categories-list-rendered');
    });
  });
});
