import { Locator, Page, expect } from '@playwright/test';

const DECK = 'app-dashboard-insights';
const WRAPPER = `${DECK} .o-dashboard-insights__card-wrapper`;
const CARD = `${WRAPPER} app-card`;

export function insightDeck(page: Page): Locator {
  return page.locator(`${DECK} .o-dashboard-insights`);
}

export function insightCard(page: Page, kind: string): Locator {
  return page.locator(`${DECK} [data-testid="dashboard-insight-${kind}"]`);
}

export async function insightKinds(page: Page): Promise<readonly string[]> {
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
    cards.map(card => (card.getAttribute('data-testid') ?? '').replace('dashboard-insight-', ''))
  );
}

export async function bringInsightToFront(page: Page, kind: string): Promise<Locator> {
  const kinds = await insightKinds(page);
  const index = kinds.indexOf(kind);
  expect(index, `insight "${kind}" is not in the deck (${kinds.join(', ')})`).toBeGreaterThan(-1);

  if (kinds.length > 1) {
    await page.locator(`${DECK} app-stack-dots .a-stack-dots__dot`).nth(index).click();
  }

  const wrapper = page.locator(WRAPPER).nth(index);
  await expect(wrapper).toHaveAttribute('data-depth', '0');
  return wrapper;
}

export async function actOnInsight(page: Page, kind: string): Promise<void> {
  const wrapper = await bringInsightToFront(page, kind);
  const action = wrapper.locator('[data-testid="insight-action-btn"]');
  await expect(action).toBeVisible();
  await action.click();
}
