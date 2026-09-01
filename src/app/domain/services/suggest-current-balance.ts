import { parseDate, normalizeAmount } from '@ibid/utils';

export function suggestCurrentBalance(
  dataRows: readonly string[][],
  dateColumnIndex: number,
  balanceColumnIndex: number
): number | undefined {
  const readings = dataRows
    .map(row => ({ date: parseDate(row[dateColumnIndex] ?? ''), raw: row[balanceColumnIndex] }))
    .filter((r): r is { date: string; raw: string } => !!r.date && !!r.raw?.trim());

  if (readings.length === 0) return undefined;

  const mostRecentDate = readings.reduce((max, r) => (r.date > max ? r.date : max), readings[0].date);
  const valuesOnMostRecentDate = readings
    .filter(r => r.date === mostRecentDate)
    .map(r => normalizeAmount(r.raw));

  return Math.max(...valuesOnMostRecentDate);
}
