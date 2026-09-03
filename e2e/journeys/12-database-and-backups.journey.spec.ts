import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 12: Database Maintenance, RxDB Data Viewer and History Logs', () => {
  test('executes complete journey for inspecting rxdb storage stats, history logs and table viewer', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '12-database-and-backups');

    await test.step('Step 1: Open database dashboard', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/database', { waitUntil: 'commit' });
      await expect(page.locator('.p-database')).toBeVisible();
      await flow.step(1, 'open-database-page', 'database-dashboard-rendered');
    });

    await test.step('Step 2: Inspect accounts management section', async () => {
      const accountsManagement = page.locator('.p-database__card--accounts').first();
      await expect(accountsManagement).toBeVisible();
      await flow.step(2, 'inspect-accounts-management', 'accounts-overview-visible');
    });

    await test.step('Step 3: Inspect backup management section', async () => {
      const backupCard = page.locator('.p-database__card--backups').first();
      await expect(backupCard).toBeVisible();
      await flow.step(3, 'inspect-backup-section', 'backup-actions-visible');
    });

    await test.step('Step 4: Inspect audit trail history logs', async () => {
      const historyLogs = page.locator('ohsaveme-db-history-logs, .o-db-history-logs').first();
      await expect(historyLogs).toBeVisible();
      await flow.step(4, 'inspect-history-logs', 'audit-trail-logs-visible');
    });
  });
});
