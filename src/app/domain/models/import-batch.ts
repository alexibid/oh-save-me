export interface ImportBatch {
  id: string;
  name: string;
  importDate: string;
  startDate: string;
  endDate: string;
  accountId: string;
  transactionCount: number;
  fileChecksum: string;
  updatedAt: number;
}
