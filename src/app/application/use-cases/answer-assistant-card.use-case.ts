import { Injectable, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { AssistantCard } from '@domain/models/assistant-card.model';
import { AssistantAnswerKind } from '@domain/models/assistant-task.model';
import { isFinancialAccount } from '@domain/models/account';
import { ConfirmRecurringExpenseUseCase } from './confirm-recurring-expense.use-case';
import { LinkInternalTransfersUseCase } from './link-internal-transfers.use-case';

@Injectable({ providedIn: 'root' })
export class AnswerAssistantCardUseCase {
  private readonly store = useStore();
  private readonly recurrence = inject(ConfirmRecurringExpenseUseCase);
  private readonly transfers = inject(LinkInternalTransfersUseCase);

  async execute(card: AssistantCard, confirmed: boolean): Promise<void> {
    const kind = card.answer?.kind;
    if (!kind) return;

    await this.handlers[kind](card, confirmed);
  }

  private readonly handlers: Record<
    AssistantAnswerKind,
    (card: AssistantCard, confirmed: boolean) => Promise<void>
  > = {
    confirm_recurring: (card, confirmed) => this.answerRecurring(card, confirmed),
    confirm_duplicate: (card, confirmed) => this.answerDuplicate(card, confirmed),
    confirm_transfer_link: (card, confirmed) => this.answerTransferLink(card, confirmed),
    close_project: (card, confirmed) => this.answerCloseProject(card, confirmed),
    confirm_salary: (card, confirmed) => this.answerSalary(card, confirmed),
    associate_asset: (card, confirmed) => this.answerAssociateAsset(card, confirmed),
    broker_cash_policy: (card, confirmed) => this.answerBrokerCashPolicy(card, confirmed),
    create_savings_goal: (card, confirmed) => this.answerCreateSavingsGoal(card, confirmed),
    confirm_asset_value: (card, confirmed) => this.answerConfirmAssetValue(card, confirmed),
    simulate_sell: (card, confirmed) => this.answerSimulateSell(card, confirmed),
    adjust_target_price: (card, confirmed) => this.answerAdjustTargetPrice(card, confirmed),
    keep_position: (card, confirmed) => this.answerKeepPosition(card, confirmed),
  };

  private async answerSimulateSell(_card: AssistantCard, _confirmed: boolean): Promise<void> {
  }

  private async answerAdjustTargetPrice(_card: AssistantCard, _confirmed: boolean): Promise<void> {
  }

  private async answerKeepPosition(_card: AssistantCard, _confirmed: boolean): Promise<void> {
  }

  private async answerAssociateAsset(card: AssistantCard, confirmed: boolean): Promise<void> {
    if (!confirmed) return;
    const transaction = this.targetOf(card);
    if (transaction) {
      await this.store.updateTransactionCategory(transaction, 'Investments');
    }
  }

  private async answerBrokerCashPolicy(card: AssistantCard, confirmed: boolean): Promise<void> {
    const accountId = card.targetId;
    if (!accountId) return;
    const account = this.store.accounts().find(a => a.id === accountId);
    if (account && isFinancialAccount(account)) {
      await this.store.updateAccount({
        ...account,
        includeInConsolidatedBalance: confirmed,
      });
    }
  }

  private async answerCreateSavingsGoal(_card: AssistantCard, _confirmed: boolean): Promise<void> {
  }

  private async answerConfirmAssetValue(card: AssistantCard, confirmed: boolean): Promise<void> {
    if (!confirmed) return;
    const budgetId = card.targetId;
    if (!budgetId) return;
    const budget = this.store.budgets().find(b => b.id === budgetId);
    if (budget) {
      await this.store.updateBudget({ ...budget });
    }
  }

  private async answerRecurring(card: AssistantCard, confirmed: boolean): Promise<void> {
    const transaction = this.targetOf(card);
    if (!transaction) return;

    await (confirmed
      ? this.recurrence.confirm(transaction)
      : this.recurrence.reject(transaction));
  }

  private async answerDuplicate(card: AssistantCard, confirmed: boolean): Promise<void> {
    const transaction = this.targetOf(card);
    if (!transaction) return;

    await this.store.updateTransactionDuplicateReview(transaction, confirmed);
  }

  private async answerTransferLink(card: AssistantCard, confirmed: boolean): Promise<void> {
    if (confirmed) {
      await this.transfers.execute();
      return;
    }

    const transaction = this.targetOf(card);
    if (transaction) await this.store.updateTransactionCategory(transaction, 'Others');
  }

  private async answerCloseProject(card: AssistantCard, confirmed: boolean): Promise<void> {
    if (!confirmed) return;

    const projectId = card.id.replace('vacation_budget_ended_', '');
    const project = this.store.budgets().find(budget => budget.id === projectId);
    if (project) await this.store.updateBudget({ ...project, isClosed: true });
  }

  private async answerSalary(card: AssistantCard, confirmed: boolean): Promise<void> {
    const transaction = this.targetOf(card);
    if (!transaction) return;

    await this.store.updateTransactionIncomeInclusion(transaction, confirmed);
    if (confirmed) {
      await this.store.updateTransactionCategory(transaction, 'Income');
    }
  }

  private targetOf(card: AssistantCard) {
    return this.store.transactions().find(transaction => transaction.id === card.targetId);
  }
}
