import { Account } from '@domain/models/account';

export interface AccountRepository {
  getAll(): Promise<readonly Account[]>;
  save(account: Readonly<Account>): Promise<void>;
  update(account: Readonly<Account>): Promise<void>;
  delete(id: string): Promise<void>;
}
