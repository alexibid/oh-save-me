import { Injectable, computed, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { I18nService } from '@application/i18n.service';
import { SuggestionEngine } from '@domain/services/suggestion-engine';
import { resolveSuggestion } from '@domain/services/suggestion-resolver';
import { AssistantSuggestion } from '@domain/models/assistant-suggestion.model';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';

@Injectable({ providedIn: 'root' })
export class GetAssistantSuggestionsUseCase {
  private readonly store = useStore();
  private readonly i18n = inject(I18nService);
  private readonly dismissalService = inject(SuggestionDismissalService);
  private readonly engine = new SuggestionEngine();

  readonly suggestions = computed<readonly AssistantSuggestion[]>(() => {
    this.i18n.currentLang();

    const templates = this.engine.buildSuggestions({
      accounts: this.store.accounts(),
      transactions: this.store.transactions(),
      budgets: this.store.budgets(),
      categories: this.store.categories(),
      startDate: this.store.startDate(),
      endDate: this.store.endDate(),
    });

    return templates.map(t =>
      resolveSuggestion(
        t,
        key => this.i18n.translate(key),
        amount => this.i18n.formatCurrency(amount),
        categoryId => this.i18n.getCategoryName(categoryId)
      )
    );
  });

  readonly activeSuggestions = computed<readonly AssistantSuggestion[]>(() =>
    this.suggestions().filter(suggestion => !this.dismissalService.isDismissed(suggestion.kind, suggestion.id))
  );
}
