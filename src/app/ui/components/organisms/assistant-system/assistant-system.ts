import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { StackedDeckComponent } from '@ui/components/organisms/stacked-deck/stacked-deck';
import { I18nService, I18N_SHARED } from '@ui/shared/i18n-shared';
import { useStore } from '@application/app-store';
import { computed, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ASSISTANT_SUGGESTION_TEMPLATE_FIXTURES } from '@domain/models/assistant-suggestion.fixtures';
import { resolveSuggestion } from '@domain/services/suggestion-resolver';

import { GetOperationalTasksUseCase } from '@application/use-cases/get-operational-tasks.use-case';
import { BottomSheetDialogComponent, ButtonComponent, FabComponent, IconComponent } from 'ibid-ui';

export type AssistantState = 'closed' | 'peek' | 'expanded';

@Component({
  selector: 'ohsaveme-assistant-system',
  standalone: true,
  imports: [
    FabComponent,
    BottomSheetDialogComponent,
    StackedDeckComponent,
    IconComponent,
    ButtonComponent,
    ...I18N_SHARED,
  ],
  templateUrl: './assistant-system.html',
  styleUrl: './assistant-system.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantSystem {
  protected readonly i18n = inject(I18nService);
  protected readonly store = useStore();
  private readonly tasksUseCase = inject(GetOperationalTasksUseCase);

  public readonly sheetState = signal<AssistantState>('closed');
  public readonly selectedTab = signal<'active' | 'archived'>('active');

  public readonly archivedCount = computed(() => this.tasksUseCase.archivedTaskCards().length);
  public readonly activeCount = computed(() => this.tasksUseCase.activeTaskCards().length);

  constructor() {
    const router = inject(Router);
    router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.closeAssistant();
    });
  }

  public readonly demoSuggestions = computed(() => {
    if (this.store.accounts().length > 0) return undefined;
    return ASSISTANT_SUGGESTION_TEMPLATE_FIXTURES.map(t =>
      resolveSuggestion(
        t,
        (key: string) => this.i18n.translate(key),
        (amount: number) => this.i18n.formatCurrency(amount),
        (categoryId: string) => this.i18n.getCategoryName(categoryId)
      )
    );
  });

  private startY = 0;
  private isDragging = false;

  public openAssistant(): void {
    this.sheetState.set('peek');
    this.selectedTab.set('active');
  }

  public openArchived(): void {
    this.sheetState.set('expanded');
    this.selectedTab.set('archived');
  }

  public toggleExpanded(): void {
    this.sheetState.update(s => (s === 'expanded' ? 'peek' : 'expanded'));
  }

  public closeAssistant(): void {
    this.sheetState.set('closed');
  }

  public onPointerDown(event: PointerEvent): void {
    if (this.sheetState() === 'closed') {
      return;
    }
    this.isDragging = true;
    this.startY = event.clientY;
  }

  @HostListener('document:pointermove', ['$event'])
  public onPointerMove(_event: PointerEvent): void {
    if (!this.isDragging) {
      return;
    }
  }

  @HostListener('document:pointerup', ['$event'])
  public onPointerUp(event: PointerEvent): void {
    if (!this.isDragging) {
      return;
    }
    this.isDragging = false;

    const endY = event.clientY;
    const diffY = endY - this.startY;

    if (diffY < -50) {
      this.sheetState.set('expanded');
    } else if (diffY > 50) {
      if (this.sheetState() === 'expanded') {
        this.sheetState.set('peek');
      } else if (this.sheetState() === 'peek') {
        this.sheetState.set('closed');
      }
    }
  }
}
