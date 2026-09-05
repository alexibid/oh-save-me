import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';

import { Router } from '@angular/router';
import { AssistantAnswer, AssistantCard } from '@domain/models/assistant-card.model';
import { buildFilterParams } from '@domain/services/suggestion-resolver';
import { GetOperationalTasksUseCase } from '@application/use-cases/get-operational-tasks.use-case';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';
import { AnswerAssistantCardUseCase } from '@application/use-cases/answer-assistant-card.use-case';
import { useStore } from '@application/app-store';
import { AssistantPeekDeckComponent } from '@ui/components/molecules/assistant-peek-deck/assistant-peek-deck';
import { AssistantExpandedDeckComponent } from '@ui/components/molecules/assistant-expanded-deck/assistant-expanded-deck';

import { Dialog } from '@angular/cdk/dialog';
import { PositionSellSimulatorDialogComponent } from '@ui/components/organisms/position-sell-simulator-dialog/position-sell-simulator-dialog';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { IconComponent, StackDotsComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-stacked-deck',
  standalone: true,
  imports: [AssistantPeekDeckComponent, AssistantExpandedDeckComponent, StackDotsComponent, IconComponent, ...I18N_SHARED],
  templateUrl: './stacked-deck.html',
  styleUrl: './stacked-deck.scss',
})
export class StackedDeckComponent {
  private readonly router = inject(Router);
  private readonly store = useStore();
  private readonly dialog = inject(Dialog);
  private readonly tasksUseCase = inject(GetOperationalTasksUseCase);
  private readonly dismissalService = inject(SuggestionDismissalService);
  private readonly answers = inject(AnswerAssistantCardUseCase);

  @Input() overrideSuggestions?: readonly AssistantCard[];
  @Input() layoutMode: 'peek' | 'expanded' = 'peek';
  @Input() initialTab: 'active' | 'archived' = 'active';
  @Output() readonly allDismissed = new EventEmitter<void>();
  @Output() readonly openArchivedTab = new EventEmitter<void>();

  private readonly frontId = signal<string | null>(null);

  protected readonly visibleSuggestions = computed<readonly AssistantCard[]>(() => {
    if (!this.overrideSuggestions) return this.tasksUseCase.activeTaskCards();
    return this.overrideSuggestions.filter(s => !this.dismissalService.isDismissed(s.kind, s.id));
  });

  protected readonly archivedSuggestions = computed<readonly AssistantCard[]>(() => {
    if (!this.overrideSuggestions) return this.tasksUseCase.archivedTaskCards();
    return this.overrideSuggestions.filter(s => this.dismissalService.isDismissed(s.kind, s.id));
  });

  protected readonly hasAnySuggestion = computed(() =>
    this.visibleSuggestions().length > 0 || (this.layoutMode === 'expanded' && this.archivedSuggestions().length > 0)
  );

  protected readonly frontIndex = computed(() => {
    const list = this.visibleSuggestions();
    const idx = list.findIndex(s => s.id === this.frontId());
    return idx === -1 ? 0 : idx;
  });

  onCardTapped(suggestion: AssistantCard): void {
    this.dismissalService.markActioned(suggestion.kind, suggestion.id);

    if (suggestion.action === 'open_add_entry') {
      this.store.triggerAddClick();
      return;
    }
    if (suggestion.action === 'open_vacation_detail') {
      const bid = suggestion.id.replace('vacation_budget_active_', '');
      this.store.openVacationDetail(bid);
      return;
    }
    if (suggestion.action === 'open_sell_simulator') {
      const budgetId = suggestion.targetId;
      const budget = budgetId ? this.store.budgets().find(b => b.id === budgetId) : undefined;
      const costBasis = budget ? budget.amount : 0;
      const marketValue = budget ? (budget.currentValue ?? budget.amount) : 0;
      const assetName = budget?.name || '';
      this.dialog.open(PositionSellSimulatorDialogComponent, {
        data: { assetName, costBasis, marketValue },
        panelClass: 'm-dialog--bottom-sheet',
      });
      return;
    }
    if (suggestion.route) {
      this.router.navigate([suggestion.route], { queryParams: buildFilterParams(suggestion.filter) });
    }
  }

  async onAnswered({ card, confirmed }: AssistantAnswer): Promise<void> {
    await this.answers.execute(card, confirmed);
    this.dismissalService.markActioned(card.kind, card.id);
  }

  onDismissed(suggestion: AssistantCard): void {
    this.dismissalService.dismiss(suggestion.kind, suggestion.id);
    if (this.visibleSuggestions().length === 0) {
      this.allDismissed.emit();
    }
  }

  onUnarchived(card: AssistantCard): void {
    this.dismissalService.reset(card.kind, card.id);
  }

  onDeleted(card: AssistantCard): void {
    this.dismissalService.reset(card.kind, card.id);
  }

  onClearArchive(): void {
    this.dismissalService.clearAll();
  }

  onRotateBy(steps: number): void {
    const list = this.visibleSuggestions();
    if (list.length === 0) return;
    const nextIndex = ((this.frontIndex() + steps) % list.length + list.length) % list.length;
    this.frontId.set(list[nextIndex].id);
  }

  onDotClicked(priorityIndex: number): void {
    const target = this.visibleSuggestions()[priorityIndex];
    if (target) this.frontId.set(target.id);
  }
}
