import { DbSnapshot } from '@domain/shared/db-snapshot.utils';

export function downloadBackupJson(backup: DbSnapshot): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const nowDate = new Date();
  const dateHour = nowDate.toISOString().slice(0, 10) + '_' + nowDate.toTimeString().slice(0, 8).replace(/:/g, '-');

  a.href = url;
  a.download = `app_backup_${dateHour}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
