import { HistoryLog } from '@domain/models/history-log';

export interface HistoryLogRepository {
  getAll(): Promise<readonly HistoryLog[]>;
  save(log: HistoryLog): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
