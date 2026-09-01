import { Budget } from '@domain/models/budget';

export interface BudgetRepository {
  getAll(): Promise<readonly Budget[]>;
  save(budget: Readonly<Budget>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
