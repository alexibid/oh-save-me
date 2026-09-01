import { ImportBatch } from '@domain/models/import-batch';

export interface ImportBatchRepository {
  getAll(): Promise<readonly ImportBatch[]>;
  save(batch: Readonly<ImportBatch>): Promise<void>;
  delete(id: string): Promise<void>;
}
