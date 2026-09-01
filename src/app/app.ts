import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { Header } from './ui/components/organisms/header/header';
import { Sidenav } from './ui/components/organisms/sidenav/sidenav';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ImportAssistantDialog } from './ui/components/organisms/import-assistant-dialog/import-assistant-dialog';
import { ImportTriageDialog } from './ui/components/organisms/import-triage-dialog/import-triage-dialog';
import { AccountCreateDialog } from './ui/components/organisms/account-create-dialog/account-create-dialog';
import { AddEntryDialog } from './ui/components/organisms/add-entry-dialog/add-entry-dialog';
import { useStore } from './application/app-store';
import { Transaction } from './domain/models/transaction';
import { isFinancialAccount } from './domain/models/account';
import { TRANSACTION_REPOSITORY_TOKEN } from './application/tokens';
import { CategoryMlService } from './application/services/category-ml.service';
import { categorizeInvestmentTransaction } from './domain/services/investment-category';
import { AssistantSystem } from './ui/components/organisms/assistant-system/assistant-system';
import { VacationDetail } from './ui/components/organisms/vacation-detail/vacation-detail';
import { LoadingCurtainComponent } from './ui/components/organisms/loading-curtain/loading-curtain';
import { injectInsightId, injectHasHeaderActionRow } from './ui/shared/route-query.utils';

@Component({
  selector: 'ohsaveme-root',
  standalone: true,
  imports: [RouterOutlet, Header, Sidenav, ImportAssistantDialog, ImportTriageDialog, AccountCreateDialog, AddEntryDialog, MatSidenavModule, AssistantSystem, VacationDetail, LoadingCurtainComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly store = useStore();
  protected readonly insightId = injectInsightId();
  protected readonly hasHeaderActionRow = injectHasHeaderActionRow();
  private readonly transactionRepository = inject(TRANSACTION_REPOSITORY_TOKEN, { optional: true });
  private readonly categoryMlService = inject(CategoryMlService, { optional: true });
  protected readonly showImportAssistant = signal<boolean>(false);
  protected readonly showAccountCreate = signal<boolean>(false);
  protected readonly showAddEntryChooser = signal<boolean>(false);
  protected readonly showVacationDetail = signal<boolean>(false);
  protected readonly activeVacationBudgetId = signal<string>('');
  protected readonly importFileEvent = signal<Event | null>(null);
  protected readonly showTriage = signal<boolean>(false);
  protected readonly triageTransactions = signal<Transaction[]>([]);
  protected readonly triageAccountType = computed(() => {
    const accountId = this.triageTransactions()[0]?.accountId;
    const account = this.store.accounts().find(a => a.id === accountId);
    return account && isFinancialAccount(account) ? account.type : undefined;
  });
  private readonly subscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.store.importClicked$.subscribe(() => {
        this.showImportAssistant.set(true);
      }),
      this.store.addClicked$.subscribe(() => {
        this.showAddEntryChooser.set(true);
      }),
      this.store.openVacationDetail$.subscribe(budgetId => {
        this.activeVacationBudgetId.set(budgetId);
        this.showVacationDetail.set(true);
      }),
      this.store.fileSelected$.subscribe(event => {
        this.importFileEvent.set(event);
        this.showImportAssistant.set(true);
      })
    );
  }

  onChooseCreateAccount() {
    this.showAddEntryChooser.set(false);
    this.showAccountCreate.set(true);
  }

  onChooseImport() {
    this.showAddEntryChooser.set(false);
    this.showImportAssistant.set(true);
  }

  onImportCompleted() {
    this.showImportAssistant.set(false);
    this.importFileEvent.set(null);
    this.store.applyPreset(this.store.preset());
  }

  onTriageReady(transactions: Transaction[]) {
    this.triageTransactions.set(transactions);
    this.showTriage.set(true);
  }

  async onTriageResolved(resolvedTransactions: Transaction[]) {
    this.showTriage.set(false);

    const patchesById = new Map(resolvedTransactions.map(tx => [tx.id, tx]));
    const current = this.store.transactions().map(tx => patchesById.get(tx.id) ?? tx);
    this.store.setTransactions(current);

    for (const tx of resolvedTransactions) {
      if (this.transactionRepository) {
        await this.transactionRepository.update(tx);
      }
      const isKnownInvestmentFact = categorizeInvestmentTransaction(tx.investmentType) === tx.category;
      if (!tx.pendingReview && !isKnownInvestmentFact && this.categoryMlService) {
        this.categoryMlService.learn(tx.description, tx.category);
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
