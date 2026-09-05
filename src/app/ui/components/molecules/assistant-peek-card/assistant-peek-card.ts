import { Component, Input, Output, EventEmitter, signal, HostBinding } from '@angular/core';
import { I18N_SHARED } from '@ui/shared/i18n-shared';

import { AssistantCard, AssistantCardKind } from '@domain/models/assistant-card.model';
import { AccentIconComponent, DismissButtonComponent, HandDrawnDirective, IconComponent } from 'ibid-ui';

type CardAccent = 'coral' | 'amber' | 'teal' | 'pink';

const KIND_ACCENT: Record<AssistantCardKind, CardAccent> = {
  no_accounts:            'coral',
  category_overspend:     'coral',
  pending_triage:         'amber',
  uncategorized:          'pink',
  category_needs_budget:  'pink',
  outlier_transactions:   'teal',
  recurring_expense:      'teal',
  positive_savings:       'teal',
  vacation_budget_active: 'teal',
  vacation_budget_ended:  'teal',
  duplicate_charge:       'coral',
  unmatched_transfer:     'amber',
  confirm_recurring:      'teal',
  confirm_salary:         'teal',
  broker_transfer:        'amber',
  broker_idle_cash:       'teal',
  structural_surplus:     'teal',
  stale_asset_revaluation:'amber',
  target_profit_reached:  'teal',
};

const SWIPE_THRESHOLD_PX = 40;

@Component({
  selector: 'ohsaveme-assistant-peek-card',
  standalone: true,
  imports: [AccentIconComponent, DismissButtonComponent, HandDrawnDirective, IconComponent, ...I18N_SHARED],
  templateUrl: './assistant-peek-card.html',
  styleUrl: './assistant-peek-card.scss',
  host: {
    '[attr.data-depth]': 'depth',
    '[attr.size]': 'size'
  },
})
export class AssistantPeekCardComponent {
  @Input({ required: true }) suggestion!: AssistantCard;

  @Input({ required: true }) depth = 0;
  @Input() size: 'small' | 'big' = 'small';

  @Output() readonly activated = new EventEmitter<void>();

  @Output() readonly dismissed = new EventEmitter<void>();

  @Output() readonly swiped = new EventEmitter<'next' | 'previous'>();

  @Output() readonly answered = new EventEmitter<boolean>();

  protected get isAnswerable(): boolean {
    return !!this.suggestion.answer;
  }

  protected get hasAction(): boolean {
    return !!(this.suggestion.route || this.suggestion.action || this.suggestion.filter);
  }

  protected get actionLabelKey(): string {
    switch (this.suggestion.kind) {
      case 'pending_triage':
        return 'assistantActionTriage';
      case 'uncategorized':
      case 'category_overspend':
        return 'assistantActionViewMovements';
      case 'outlier_transactions':
        return 'assistantActionViewOutliers';
      case 'category_needs_budget':
        return 'assistantActionSetBudget';
      case 'no_accounts':
        return 'assistantActionCreateAccount';
      case 'vacation_budget_active':
        return 'assistantActionManageVacation';
      case 'vacation_budget_ended':
        return 'assistantActionValidateVacation';
      case 'positive_savings':
        return 'assistantActionViewSummary';
      default:
        return 'assistantActionViewMovements';
    }
  }

  protected onAnswer(event: Event, confirmed: boolean): void {
    event.stopPropagation();
    this.answered.emit(confirmed);
  }

  protected dragOffsetPx = 0;
  protected isDragging = false;

  private pointerStart: { x: number; y: number } | null = null;
  private wasSwipe = false;

  protected get accent(): CardAccent {
    return KIND_ACCENT[this.suggestion.kind];
  }

  protected get isFront(): boolean {
    return this.depth === 0;
  }

  public readonly isExpanded = signal(false);

  @HostBinding('class.is-expanded')
  get expandedClass() {
    return this.isExpanded();
  }

  protected onCardClick(): void {
    if (this.wasSwipe) {
      this.wasSwipe = false;
      return;
    }
    if (this.depth !== 0) {
      this.activated.emit();
      return;
    }
    if (!this.isExpanded()) {
      this.isExpanded.set(true);
    }
  }

  protected onExecute(event: Event): void {
    event.stopPropagation();
    this.activated.emit();
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.isFront) return;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.isDragging = true;
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointerStart) return;
    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    this.dragOffsetPx = deltaX;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.pointerStart) return;
    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;
    this.pointerStart = null;
    this.dragOffsetPx = 0;
    this.isDragging = false;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
      this.wasSwipe = true;
      this.swiped.emit(deltaX < 0 ? 'next' : 'previous');
    }
  }
}
