import { Injectable } from '@angular/core';
import { useStore } from '@application/app-store';
import { CustomAccount } from '@domain/models/account';

export interface CreateCustomAccountInput {
  readonly name: string;
  readonly purpose: string;
  readonly presetId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreateCustomAccountUseCase {
  private readonly store = useStore();

  async execute(input: CreateCustomAccountInput): Promise<CustomAccount> {
    const account: CustomAccount = {
      id: `acc_${Date.now()}`,
      kind: 'custom',
      name: input.name.trim(),
      purpose: input.purpose.trim(),
      presetId: input.presetId,
      updatedAt: Date.now()
    };
    await this.store.addAccount(account);
    return account;
  }
}
