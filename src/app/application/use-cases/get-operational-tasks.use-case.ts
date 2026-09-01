import { Injectable, computed, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { I18nService } from '@application/i18n.service';
import { SuggestionEngine } from '@domain/services/suggestion-engine';
import { resolveOperationalTask } from '@domain/services/suggestion-resolver';
import { OperationalTask } from '@domain/models/assistant-task.model';
import { AssistantCard, toAssistantCard } from '@domain/models/assistant-card.model';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';
import { InsightConfigService } from '@application/services/insight-config.service';
import { BudgetSelectors } from '@application/selectors/budget.selectors';

@Injectable({ providedIn: 'root' })
export class GetOperationalTasksUseCase {
  private readonly store = useStore();
  private readonly i18n = inject(I18nService);
  private readonly dismissalService = inject(SuggestionDismissalService);
  private readonly insightConfig = inject(InsightConfigService);
  private readonly budgetSelectors = inject(BudgetSelectors);
  private readonly engine = new SuggestionEngine();

  readonly tasks = computed<readonly OperationalTask[]>(() => {
    this.i18n.currentLang();

    const templates = this.engine.buildOperationalTasks({
      accounts: this.store.accounts(),
      transactions: this.store.transactions(),
      budgets: this.store.budgets(),
      categories: this.store.categories(),
      startDate: this.store.startDate(),
      endDate: this.store.endDate(),
      spendableBalance: this.budgetSelectors.freeBalance(),
      config: this.insightConfig.config(),
    });

    return templates.map(t =>
      resolveOperationalTask(
        t,
        key => this.i18n.translate(key),
        amount => this.i18n.formatCurrency(amount),
        categoryId => this.i18n.getCategoryName(categoryId)
      )
    );
  });

  readonly activeTasks = computed<readonly OperationalTask[]>(() =>
    this.tasks().filter(task => !this.dismissalService.isDismissed(task.kind, task.id))
  );

  readonly activeTaskCards = computed<readonly AssistantCard[]>(() =>
    this.activeTasks().map(toAssistantCard)
  );

  readonly archivedTasks = computed<readonly OperationalTask[]>(() =>
    this.tasks().filter(task => this.dismissalService.isDismissed(task.kind, task.id))
  );

  readonly archivedTaskCards = computed<readonly AssistantCard[]>(() =>
    this.archivedTasks().map(toAssistantCard)
  );
}
