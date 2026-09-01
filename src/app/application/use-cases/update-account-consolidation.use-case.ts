import { Injectable } from '@angular/core';
import { useStore } from '@application/app-store';
import { FinancialAccount } from '@domain/models/account';

@Injectable({
  providedIn: 'root'
})
export class UpdateAccountConsolidationUseCase {
  private readonly store = useStore();

  async execute(account: FinancialAccount, includeInConsolidatedBalance: boolean): Promise<void> {
    await this.store.updateAccount({ ...account, includeInConsolidatedBalance, updatedAt: Date.now() });
  }
}
