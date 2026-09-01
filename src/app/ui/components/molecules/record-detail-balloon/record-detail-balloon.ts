import { Component, EventEmitter, HostListener, Output, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { Transaction } from '@domain/models/transaction';
import { RecordListSchema } from '@domain/models/record-list-schema';
import { I18N_SHARED, I18nService, translate } from '@ui/shared/i18n-shared';
import { IconComponent, resolveSmartCellComponent } from 'ibid-ui';

const BALLOON_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 }
];

@Component({
  selector: 'ohsaveme-record-detail-balloon',
  standalone: true,
  imports: [CommonModule, OverlayModule, IconComponent, I18N_SHARED],
  templateUrl: './record-detail-balloon.html',
  styleUrl: './record-detail-balloon.scss'
})
export class RecordDetailBalloonComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly positions = BALLOON_POSITIONS;
  protected readonly resolveSmartCellComponent = resolveSmartCellComponent;

  readonly record = input.required<Transaction>();
  readonly schema = input.required<RecordListSchema<Transaction>>();
  readonly showActions = input(false);
  readonly isPinned = input(false);

  @Output() pinToggle = new EventEmitter<void>();

  protected readonly isOpen = signal(false);

  protected readonly secondaryColumns = computed(() => this.schema().columns.filter(column => !column.primary));

  protected readonly pinLabel = computed(() =>
    translate(this.i18n, this.isPinned() ? 'recordDetailBalloonUnpin' : 'recordDetailBalloonPin')
  );

  toggle(): void {
    this.isOpen.set(!this.isOpen());
  }

  close(): void {
    this.isOpen.set(false);
  }

  onPinToggle(): void {
    this.pinToggle.emit();
    this.close();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close();
  }
}
