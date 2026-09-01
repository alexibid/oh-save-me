import { Injectable } from '@angular/core';
import { useStore } from '@application/app-store';
import { FinancialAccount, AccountType, AccountScope } from '@domain/models/account';

export interface CreateFinancialAccountInput {
  readonly name: string;
  readonly type: AccountType;
  readonly scope: AccountScope;
  readonly includeInConsolidatedBalance: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CreateFinancialAccountUseCase {
  private readonly store = useStore();

  async execute(input: CreateFinancialAccountInput): Promise<FinancialAccount> {
    const account: FinancialAccount = {
      id: `acc_${Date.now()}`,
      kind: 'financial',
      name: input.name.trim(),
      type: input.type,
      scope: input.scope,
      includeInConsolidatedBalance: input.includeInConsolidatedBalance,
      unit: 'EUR',
      updatedAt: Date.now()
    };
    await this.store.addAccount(account);
    return account;
  }
}
