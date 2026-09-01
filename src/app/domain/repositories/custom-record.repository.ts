import { CustomRecord } from '@domain/models/custom-record';

export interface CustomRecordRepository {
  getAll(): Promise<readonly CustomRecord[]>;
  getByAccountId(accountId: string): Promise<readonly CustomRecord[]>;
  save(record: Readonly<CustomRecord>): Promise<void>;
  saveMany(records: readonly Readonly<CustomRecord>[]): Promise<void>;
  delete(id: string): Promise<void>;
}
