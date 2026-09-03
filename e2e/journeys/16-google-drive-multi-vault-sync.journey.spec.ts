import { test, expect } from '@playwright/test';
import { seedE2eDatabase } from '../utils/e2e-seed';
import { FlowRecorder } from '@ibid/testing';

test.describe('User Journey 16: Google Drive OAuth and Multi-Vault Cloud Sync', () => {
  test('executes complete journey for Google OAuth login via redirect callback, multi-vault sync and persistence', async ({ page }, testInfo) => {
    const flow = new FlowRecorder(page, testInfo, '16-google-drive-multi-vault-sync');

    await test.step('Step 1: Open database page and inspect Google Sync card in disconnected state', async () => {
      await seedE2eDatabase(page, {}, new Date('2026-07-15T10:00:00'));
      await page.goto('/database', { waitUntil: 'commit' });
      await expect(page.locator('.p-database')).toBeVisible();

      const syncCard = page.locator('ohsaveme-db-sync-card').first();
      await expect(syncCard).toBeVisible();
      await expect(syncCard.locator('.o-db-sync-card__google-btn')).toBeVisible();

      await flow.step(1, 'inspect-disconnected-sync-card', 'google-sync-card-disconnected-visible');
    });

    await test.step('Step 2: Simulate Google OAuth redirect return with access_token in URL hash', async () => {
      await page.route('https://www.googleapis.com/drive/v3/files*', async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              files: [
                { id: 'folder-root-123', name: 'savvy-app', mimeType: 'application/vnd.google-apps.folder' },
                { id: 'folder-shared-456', name: 'shared', mimeType: 'application/vnd.google-apps.folder' },
                { id: 'file-private-789', name: 'vault-private.json', mimeType: 'application/json', modifiedTime: '2026-07-15T09:00:00Z' },
                { id: 'file-joint-101', name: 'vault-joint.json', mimeType: 'application/json', modifiedTime: '2026-07-15T09:00:00Z' }
              ]
            })
          });
        } else if (method === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'new-folder-id', name: 'savvy-app' })
          });
        } else {
          await route.continue();
        }
      });

      await page.route('https://www.googleapis.com/upload/drive/v3/files*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'uploaded-file-id', name: 'vault.json' })
        });
      });

      await page.route('https://www.googleapis.com/oauth2/v3/userinfo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ email: 'alexandre.teste@gmail.com', name: 'Alexandre Santos' })
        });
      });

      await page.goto('/database#access_token=ya29.e2e-test-valid-access-token-999&expires_in=3600', { waitUntil: 'commit' });
      await expect(page.locator('.p-database')).toBeVisible();

      const syncCard = page.locator('ohsaveme-db-sync-card').first();
      await expect(syncCard).toBeVisible();

      await expect(syncCard.locator('.o-db-sync-card__status-badge--success')).toBeVisible();
      await expect(syncCard.locator('.o-db-sync-card__sync-btn')).toBeVisible();

      await flow.step(2, 'oauth-redirect-callback', 'authenticated-connected-state-active');
    });

    await test.step('Step 3: Trigger multi-vault cloud synchronization', async () => {
      const syncCard = page.locator('ohsaveme-db-sync-card').first();
      const syncBtn = syncCard.locator('.o-db-sync-card__sync-btn');
      await expect(syncBtn).toBeEnabled();

      await syncBtn.click();

      await expect(syncCard.locator('.o-db-sync-card__status-badge--success')).toBeVisible();

      await flow.step(3, 'trigger-multi-vault-sync', 'sync-completed-with-timestamps');
    });

    await test.step('Step 4: Verify session persistence after page reload', async () => {
      await page.reload();
      await expect(page.locator('.p-database')).toBeVisible();

      const syncCard = page.locator('ohsaveme-db-sync-card').first();
      await expect(syncCard.locator('.o-db-sync-card__status-badge--success')).toBeVisible();

      await flow.step(4, 'verify-session-persistence', 'auth-session-persisted-after-reload');
    });

    await test.step('Step 5: Disconnect Google account and verify return to initial disconnected state', async () => {
      const syncCard = page.locator('ohsaveme-db-sync-card').first();
      const disconnectBtn = syncCard.locator('.o-db-sync-card__disconnect-btn');
      await expect(disconnectBtn).toBeVisible();

      await disconnectBtn.click();

      await expect(syncCard.locator('.o-db-sync-card__google-btn')).toBeVisible();

      await flow.step(5, 'disconnect-google-account', 'google-sync-disconnected-cleanly');
    });
  });
});
