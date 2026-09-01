import { Component, Output, EventEmitter, ChangeDetectionStrategy, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssistantCard } from '@domain/models/assistant-card.model';
import { AssistantAnswer } from '@domain/models/assistant-card.model';
import { AssistantPeekCardComponent } from '@ui/components/molecules/assistant-peek-card/assistant-peek-card';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { IconButtonComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-assistant-expanded-deck',
  standalone: true,
  imports: [CommonModule, AssistantPeekCardComponent, IconComponent, IconButtonComponent, ...I18N_SHARED],
  templateUrl: './assistant-expanded-deck.html',
  styleUrl: './assistant-expanded-deck.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantExpandedDeckComponent {
  readonly suggestions = input<readonly AssistantCard[]>([]);
  readonly archivedSuggestions = input<readonly AssistantCard[]>([]);
  readonly frontIndex = input<number>(0);
  readonly initialTab = input<'active' | 'archived'>('active');

  @Output() readonly cardTapped = new EventEmitter<AssistantCard>();
  @Output() readonly dismissed = new EventEmitter<AssistantCard>();
  @Output() readonly answered = new EventEmitter<AssistantAnswer>();
  @Output() readonly rotateBy = new EventEmitter<number>();
  @Output() readonly unarchived = new EventEmitter<AssistantCard>();
  @Output() readonly deleted = new EventEmitter<AssistantCard>();
  @Output() readonly clearArchive = new EventEmitter<void>();

  protected readonly currentTab = signal<'active' | 'archived'>('active');

  constructor() {
    effect(() => {
      this.currentTab.set(this.initialTab());
    });
  }

  protected readonly PAGE_SIZE = 4;
  protected readonly ROTATE_STEP = 3;

  protected readonly visibleItems = computed<readonly AssistantCard[]>(() => {
    const list = this.suggestions();
    if (list.length === 0) return [];

    const front = this.frontIndex();
    return Array.from(
      { length: Math.min(this.PAGE_SIZE, list.length) },
      (_, offset) => list[(front + offset) % list.length]
    );
  });

  protected readonly hasMorePages = computed(() => this.suggestions().length > this.PAGE_SIZE);

  onNextPage(): void {
    this.rotateBy.emit(this.ROTATE_STEP);
  }

  onPrevPage(): void {
    this.rotateBy.emit(-this.ROTATE_STEP);
  }
}
