import { Injectable, inject } from '@angular/core';
import { Account, AccountType, AccountScope, isFinancialAccount } from '@domain/models/account';
import { AccountRepository } from '@domain/repositories/account.repository';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxAccountDocument } from './schemas/account.schema';

function toAccount(json: RxAccountDocument): Account {
  if (json.kind === 'custom') {
    return {
      id: json.id,
      kind: 'custom',
      name: json.name,
      purpose: json.purpose ?? '',
      presetId: json.presetId,
      updatedAt: json.updatedAt
    };
  }
  return {
    id: json.id,
    kind: 'financial',
    name: json.name,
    type: json.type as AccountType,
    scope: json.scope as AccountScope,
    includeInConsolidatedBalance: json.includeInConsolidatedBalance ?? true,
    unit: json.unit ?? 'EUR',
    openingBalance: json.openingBalance,
    updatedAt: json.updatedAt
  };
}

function toDocument(account: Readonly<Account>): RxAccountDocument {
  if (isFinancialAccount(account)) {
    return {
      id: account.id,
      name: account.name,
      updatedAt: Date.now(),
      kind: 'financial',
      type: account.type,
      scope: account.scope,
      includeInConsolidatedBalance: account.includeInConsolidatedBalance,
      unit: account.unit,
      openingBalance: account.openingBalance,
      deleted: false
    };
  }
  return {
    id: account.id,
    name: account.name,
    updatedAt: Date.now(),
    kind: 'custom',
    purpose: account.purpose,
    presetId: account.presetId,
    deleted: false
  };
}

@Injectable({
  providedIn: 'root'
})
export class RxdbAccountRepository implements AccountRepository {
  private readonly dbService = inject(RxDbDatabaseService);

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.accounts;
  }

  async getAll(): Promise<readonly Account[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => toAccount(doc.toJSON()));
  }

  async save(account: Readonly<Account>): Promise<void> {
    const col = await this.getCollection();
    await col.upsert(toDocument(account));
  }

  async update(account: Readonly<Account>): Promise<void> {
    await this.save(account);
  }

  async delete(id: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(id).exec();
    if (doc) {
      const json = doc.toJSON();
      await col.upsert({
        ...json,
        updatedAt: Date.now(),
        deleted: true
      });
    }
  }
}
