import { Component, Input, Output, EventEmitter } from '@angular/core';

import { AssistantCard } from '@domain/models/assistant-card.model';
import { AssistantAnswer } from '@domain/models/assistant-card.model';
import { AssistantPeekCardComponent } from '@ui/components/molecules/assistant-peek-card/assistant-peek-card';

const MAX_VISIBLE_DEPTH = 3;

@Component({
  selector: 'ohsaveme-assistant-peek-deck',
  standalone: true,
  imports: [AssistantPeekCardComponent],
  templateUrl: './assistant-peek-deck.html',
  styleUrl: './assistant-peek-deck.scss',
  host: {
    '[attr.size]': 'size'
  }
})
export class AssistantPeekDeckComponent {
  @Input({ required: true }) suggestions!: readonly AssistantCard[];
  @Input({ required: true }) frontIndex = 0;
  @Input() size: 'small' | 'big' = 'small';

  @Output() readonly cardTapped = new EventEmitter<AssistantCard>();
  @Output() readonly dismissed = new EventEmitter<AssistantCard>();
  @Output() readonly answered = new EventEmitter<AssistantAnswer>();

  @Output() readonly rotateBy = new EventEmitter<number>();

  protected readonly maxVisibleDepth = MAX_VISIBLE_DEPTH;

  protected depthOf(index: number): number {
    const n = this.suggestions.length;
    if (n === 0) return 0;
    return ((index - this.frontIndex) % n + n) % n;
  }

  protected onCardActivated(suggestion: AssistantCard, index: number): void {
    const depth = this.depthOf(index);
    if (depth === 0) {
      this.cardTapped.emit(suggestion);
      return;
    }
    this.rotateBy.emit(depth);
  }

  protected onSwiped(direction: 'next' | 'previous'): void {
    this.rotateBy.emit(direction === 'next' ? 1 : -1);
  }
}
