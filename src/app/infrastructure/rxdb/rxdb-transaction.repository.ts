import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Transaction } from '@domain/models/transaction';
import { TransactionRepository } from '@domain/repositories/transaction.repository';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxTransactionDocument } from './schemas/transaction.schema';

@Injectable({
  providedIn: 'root'
})
export class RxdbTransactionRepository implements TransactionRepository {
  constructor(private dbService: RxDbDatabaseService) {}

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.transactions;
  }

  async getAll(): Promise<readonly Transaction[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();
    return docs.map(doc => this.mapToDomain(doc.toJSON()));
  }

  async saveAll(transactions: readonly Transaction[]): Promise<void> {
    const col = await this.getCollection();
    const now = Date.now();

    await Promise.all(
      transactions.map(async (tx) => {
        await col.upsert({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
          tags: tx.tags ? [...tx.tags] : undefined,
          notes: tx.notes,
          balance: tx.balance,
          account: tx.account,
          accountId: tx.accountId,
          importBatchId: tx.importBatchId,
          transferAccountId: tx.transferAccountId,
          linkedTransactionId: tx.linkedTransactionId,
          budgetId: tx.budgetId,
          budgetAutoAssigned: tx.budgetAutoAssigned,
          pendingReview: tx.pendingReview,
          isRecurring: tx.isRecurring,
          countsAsIncome: tx.countsAsIncome,
          isDuplicate: tx.isDuplicate,
          shares: tx.shares,
          price: tx.price,
          fee: tx.fee,
          tax: tx.tax,
          symbol: tx.symbol,
          assetName: tx.assetName,
          assetType: tx.assetType,
          investmentType: tx.investmentType,
          updatedAt: now,
          deleted: false
        });
      })
    );
  }

  async update(transaction: Readonly<Transaction>): Promise<void> {
    const col = await this.getCollection();
    const now = Date.now();
    await col.upsert({
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      tags: transaction.tags ? [...transaction.tags] : undefined,
      notes: transaction.notes,
      balance: transaction.balance,
      account: transaction.account,
      accountId: transaction.accountId,
      importBatchId: transaction.importBatchId,
      transferAccountId: transaction.transferAccountId,
      linkedTransactionId: transaction.linkedTransactionId,
      budgetId: transaction.budgetId,
      budgetAutoAssigned: transaction.budgetAutoAssigned,
      pendingReview: transaction.pendingReview,
      isRecurring: transaction.isRecurring,
      countsAsIncome: transaction.countsAsIncome,
      isDuplicate: transaction.isDuplicate,
      shares: transaction.shares,
      price: transaction.price,
      fee: transaction.fee,
      tax: transaction.tax,
      symbol: transaction.symbol,
      assetName: transaction.assetName,
      assetType: transaction.assetType,
      investmentType: transaction.investmentType,
      updatedAt: now,
      deleted: false
    });
  }

  async delete(id: string): Promise<void> {
    const col = await this.getCollection();
    const now = Date.now();
    const doc = await col.findOne(id).exec();
    if (doc) {
      const json = doc.toJSON();
      await col.upsert({
        ...json,
        tags: json.tags ? [...json.tags] : undefined,
        updatedAt: now,
        deleted: true
      });
    }
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    const docs = await col.find().exec();
    const now = Date.now();
    await Promise.all(
      docs.map(doc => {
        const json = doc.toJSON();
        return col.upsert({
          ...json,
          tags: json.tags ? [...json.tags] : undefined,
          updatedAt: now,
          deleted: true
        });
      })
    );
  }

  watchAll(): Observable<readonly Transaction[]> {
    return new Observable<readonly Transaction[]>((subscriber) => {
      this.getCollection().then((col) => {
        const query$ = col.find({
          selector: {
            deleted: { $ne: true }
          }
        }).$;

        const sub = query$.pipe(
          map(docs => docs.map(doc => this.mapToDomain(doc.toJSON())))
        ).subscribe(subscriber);

        return () => sub.unsubscribe();
      }).catch(err => subscriber.error(err));
    });
  }

  private mapToDomain(doc: RxTransactionDocument): Transaction {
    return {
      id: doc.id,
      date: doc.date,
      description: doc.description,
      amount: doc.amount,
      category: doc.category,
      tags: doc.tags,
      notes: doc.notes,
      balance: doc.balance,
      account: doc.account,
      accountId: doc.accountId || 'default_account',
      importBatchId: doc.importBatchId || 'legacy_import',
      transferAccountId: doc.transferAccountId,
      linkedTransactionId: doc.linkedTransactionId,
      budgetId: doc.budgetId,
      budgetAutoAssigned: doc.budgetAutoAssigned,
      pendingReview: doc.pendingReview,
      isRecurring: doc.isRecurring,
      countsAsIncome: doc.countsAsIncome,
      isDuplicate: doc.isDuplicate,
      shares: doc.shares,
      price: doc.price,
      fee: doc.fee,
      tax: doc.tax,
      symbol: doc.symbol,
      assetName: doc.assetName,
      assetType: doc.assetType,
      investmentType: doc.investmentType
    };
  }
}
