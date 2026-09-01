import { Injectable } from '@angular/core';
import { RxCollection } from 'rxdb';
import { Budget, BudgetType } from '@domain/models/budget';
import { BudgetRepository } from '@domain/repositories/budget.repository';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxBudgetDocument } from './schemas/budget.schema';

@Injectable({
  providedIn: 'root'
})
export class RxdbBudgetRepository implements BudgetRepository {
  constructor(private dbService: RxDbDatabaseService) { }

  private async getCollection(): Promise<RxCollection<RxBudgetDocument>> {
    const db = await this.dbService.getDatabase();
    return db.collections.budgets;
  }

  async getAll(): Promise<readonly Budget[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => {
      const json = doc.toJSON();
      return {
        id: json.id,
        name: json.name,
        type: json.type as BudgetType,
        amount: json.amount,
        totalAmount: json.totalAmount,
        categoryId: json.categoryId,
        tags: json.tags ? [...json.tags] : undefined,
        startDate: json.startDate,
        endDate: json.endDate,
        projectStartDate: json.projectStartDate,
        projectEndDate: json.projectEndDate,
        isClosed: json.isClosed === true,
        monthlyAllocation: json.monthlyAllocation,
        paidInstalments: json.paidInstalments,
        contractedInstalments: json.contractedInstalments,
        currentValue: json.currentValue,
        outstandingDebt: json.outstandingDebt,
        appreciationPercent: json.appreciationPercent,
        kind: json.kind as Budget['kind'],
        transactionsAutoAssigned: json.transactionsAutoAssigned
      };
    });
  }

  async save(budget: Readonly<Budget>): Promise<void> {
    const col = await this.getCollection();
    const now = Date.now();
    await col.upsert({
      id: budget.id,
      name: budget.name,
      type: budget.type,
      amount: budget.amount,
      totalAmount: budget.totalAmount,
      categoryId: budget.categoryId,
      tags: budget.tags ? [...budget.tags] : undefined,
      startDate: budget.startDate,
      endDate: budget.endDate,
      projectStartDate: budget.projectStartDate,
      projectEndDate: budget.projectEndDate,
      isClosed: budget.isClosed === true,
      monthlyAllocation: budget.monthlyAllocation,
      paidInstalments: budget.paidInstalments,
      contractedInstalments: budget.contractedInstalments,
      currentValue: budget.currentValue,
      outstandingDebt: budget.outstandingDebt,
      appreciationPercent: budget.appreciationPercent,
      kind: budget.kind,
      transactionsAutoAssigned: budget.transactionsAutoAssigned,
      updatedAt: now,
      deleted: false
    });
  }

  async delete(id: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(id).exec();
    if (doc) {
      const json = doc.toJSON();
      await col.upsert({
        ...json,
        tags: json.tags ? [...json.tags] : undefined,
        updatedAt: Date.now(),
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
}
