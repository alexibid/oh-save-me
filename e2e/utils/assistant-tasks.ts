import { Locator, Page, expect } from '@playwright/test';

const SHEET = 'app-bottom-sheet-dialog';
const CARD = `${SHEET} app-assistant-peek-card`;

export async function openAssistant(page: Page): Promise<void> {
  const fab = page.locator('app-assistant-fab');
  await expect(fab).toBeVisible({ timeout: 10000 });
  await fab.click();
  await expect(page.locator(`${SHEET} .m-assistant-peek-card--front`).first()).toBeVisible();
}

export async function taskKinds(page: Page): Promise<readonly string[]> {
  let previous = -1;
  await expect
    .poll(async () => {
      const count = await page.locator(CARD).count();
      const settled = count > 0 && count === previous;
      previous = count;
      return settled;
    }, { timeout: 15000, intervals: [200, 200, 300, 500] })
    .toBe(true);

  return page.locator(CARD).evaluateAll(cards =>
    cards.map(card => (card.getAttribute('data-testid') ?? '').replace('assistant-task-', ''))
  );
}

export async function bringTaskToFront(page: Page, kind: string): Promise<Locator> {
  const kinds = await taskKinds(page);
  const index = kinds.findIndex(candidate => candidate.startsWith(kind));
  expect(index, `task "${kind}" is not in the deck (${kinds.join(', ')})`).toBeGreaterThan(-1);

  if (kinds.length > 1) {
    await page.locator(`${SHEET} app-stack-dots .a-stack-dots__dot`).nth(index).click();
  }

  const card = page.locator(CARD).nth(index).locator('.m-assistant-peek-card');
  await expect(card).toHaveClass(/--front/);
  return card;
}

export async function actOnTask(page: Page, kind: string): Promise<void> {
  const card = await bringTaskToFront(page, kind);
  await card.click();

  const action = card.locator('.m-assistant-peek-card__action-btn, .m-assistant-peek-card__actions button, .m-assistant-peek-card__answers button').first();
  await expect(action).toBeVisible();
  await action.click();
}
