import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

const HEADER_RANGE = '.o-header__date-range';
const PRESET_DROPDOWN = '.o-header__preset-dropdown';

async function readHeaderPeriod(page: import('@playwright/test').Page): Promise<{ start: string; end: string }> {
  const parts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.o-header__date-range .a-date-input__part')).map(part => ({
      dayMonth: (part.querySelector('.a-date-input__day-month')?.textContent || '').trim(),
      year: (part.querySelector('.a-date-input__year')?.textContent || '').trim()
    }))
  );

  const toIso = ({ dayMonth, year }: { dayMonth: string; year: string }) => {
    const [d, m] = dayMonth.split('/');
    return `${year}-${m}-${d}`;
  };

  const first = parts[0] ?? { dayMonth: '01/01', year: '1970' };
  const last = parts[parts.length - 1] ?? first;
  return { start: toIso(first), end: toIso(last) };
}

async function readRowDates(page: import('@playwright/test').Page): Promise<readonly string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.o-transactions-table__row'))
      .map(row => row.getAttribute('data-tx-date') || '')
      .filter(Boolean)
  );
}

test.describe('User Journey 18: Header Date Filter Propagation to Movements Table and Chart', () => {
  test('propagates the header period to the movements table and balance chart across preset changes', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '18-header-date-filter-propagation');
    await seedE2eDatabase(page);

    await test.step('Step 1: Open movements with the default header period', async () => {
      await page.goto('/movements', { waitUntil: 'commit' });
      await expect(page.locator('.p-movements').first()).toBeVisible();
      await expect(page.locator(HEADER_RANGE).first()).toBeVisible();
      await flow.step(1, 'open-movements-default-period', 'header-period-visible');
    });

    await test.step('Step 2: Every table row falls inside the header period', async () => {
      const { start, end } = await readHeaderPeriod(page);
      const rowDates = await readRowDates(page);

      expect(rowDates.length, 'table should render rows for the seeded period').toBeGreaterThan(0);
      const outside = rowDates.filter(d => d < start || d > end);
      expect(outside, `rows outside header period ${start}..${end}`).toEqual([]);

      await flow.step(2, 'assert-table-inside-period', 'no-rows-outside-header-period');
    });

    await test.step('Step 3: The balance chart spans only the header period', async () => {
      const { start, end } = await readHeaderPeriod(page);

      const axisDays = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.o-chart__surface svg text'))
          .map(node => (node.textContent || '').trim())
          .filter(label => /^\d{2}\/\d{2}$/.test(label))
      );

      expect(axisDays.length, 'chart renders day labels on the x axis').toBeGreaterThan(0);

      const allowed = new Set<string>();
      for (let day = new Date(`${start}T00:00:00Z`); day <= new Date(`${end}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
        const dd = String(day.getUTCDate()).padStart(2, '0');
        const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
        allowed.add(`${dd}/${mm}`);
      }

      const outsideAxis = axisDays.filter(label => !allowed.has(label));

      expect(
        outsideAxis,
        `chart x-axis labels outside header period ${start}..${end}`
      ).toEqual([]);

      await flow.step(3, 'assert-chart-matches-period', 'chart-domain-inside-header-period');
    });

    await test.step('Step 4: Switching the preset to the previous month re-filters table and chart', async () => {
      await page.locator(`${PRESET_DROPDOWN} .a-select__trigger`).first().click();
      const previousMonth = page.locator('.a-select__option', { hasText: /Mês Passado|Last Month/i }).first();
      await expect(previousMonth).toBeVisible();
      await previousMonth.click();
      await page.waitForTimeout(800);

      const { start, end } = await readHeaderPeriod(page);
      const rowDates = await readRowDates(page);

      const outside = rowDates.filter(d => d < start || d > end);
      expect(outside, `rows outside the previous-month period ${start}..${end}`).toEqual([]);

      await flow.step(4, 'switch-preset-previous-month', 'table-refiltered-to-previous-month');
    });

    await test.step('Step 5: A rolling 90-day preset re-filters the table to its own window', async () => {
      await page.locator(`${PRESET_DROPDOWN} .a-select__trigger`).first().click();
      const ninetyDays = page.locator('.a-select__option', { hasText: /Últimos 90 dias|Last 90 days/i }).first();
      await expect(ninetyDays).toBeVisible();
      await ninetyDays.click();
      await page.waitForTimeout(800);

      const { start, end } = await readHeaderPeriod(page);

      const spanDays = Math.round(
        (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86400000
      );
      expect(spanDays, 'rolling preset spans exactly 90 days').toBe(90);

      const rowDates = await readRowDates(page);
      const outside = rowDates.filter(d => d < start || d > end);
      expect(outside, `rows outside the 90-day window ${start}..${end}`).toEqual([]);

      await flow.step(5, 'select-last-90-days', 'table-refiltered-to-rolling-window');
    });

    await test.step('Step 6: The all-time preset widens the period to every seeded record', async () => {
      await page.locator(`${PRESET_DROPDOWN} .a-select__trigger`).first().click();
      const allTime = page.locator('.a-select__option', { hasText: /Desde sempre|All time/i }).first();
      await expect(allTime).toBeVisible();
      await allTime.click();
      await page.waitForTimeout(800);

      const { start, end } = await readHeaderPeriod(page);

      expect(start < '2025-01-01', `all-time start ${start} reaches the oldest seeded year`).toBe(true);

      const rowDates = await readRowDates(page);
      const outside = rowDates.filter(d => d < start || d > end);
      expect(outside, `rows outside the all-time window ${start}..${end}`).toEqual([]);

      await flow.step(6, 'select-all-time', 'period-covers-every-seeded-record');
    });

    await test.step('Step 7: An explicit URL period overrides the header preset', async () => {
      await page.goto('/movements?startDate=2026-06-01&endDate=2026-06-30', { waitUntil: 'commit' });
      await expect(page.locator('.p-movements').first()).toBeVisible();
      await page.waitForTimeout(600);

      const rowDates = await readRowDates(page);
      const outside = rowDates.filter(d => d < '2026-06-01' || d > '2026-06-30');
      expect(outside, 'rows outside the URL-provided period').toEqual([]);

      await flow.step(7, 'url-period-overrides-preset', 'table-matches-url-period');
    });

    await test.step('Step 8: The period survives a reload', async () => {
      await page.reload();
      await expect(page.locator('.p-movements').first()).toBeVisible();
      await page.waitForTimeout(600);

      const rowDates = await readRowDates(page);
      const outside = rowDates.filter(d => d < '2026-06-01' || d > '2026-06-30');
      expect(outside, 'rows outside the URL period after reload').toEqual([]);

      await flow.step(8, 'reload-persists-period', 'period-preserved-after-reload');
    });
  });
});
