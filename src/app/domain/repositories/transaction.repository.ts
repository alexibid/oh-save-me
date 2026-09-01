import { Transaction } from '@domain/models/transaction';

export interface TransactionRepository {
  getAll(): Promise<readonly Transaction[]>;
  saveAll(transactions: readonly Transaction[]): Promise<void>;
  update(transaction: Readonly<Transaction>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
