import { Component, EventEmitter, HostListener, Output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { IconComponent } from 'ibid-ui';

export interface ColumnManagerItem {
  readonly key: string;
  readonly labelKey: string;
  readonly visible: boolean;
  readonly locked: boolean;
}

export interface ColumnReorderEvent {
  readonly previousIndex: number;
  readonly currentIndex: number;
}

const PANEL_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 }
];

@Component({
  selector: 'ohsaveme-column-manager-panel',
  standalone: true,
  imports: [CommonModule, OverlayModule, DragDropModule, IconComponent, I18N_SHARED],
  templateUrl: './column-manager-panel.html',
  styleUrl: './column-manager-panel.scss'
})
export class ColumnManagerPanelComponent {
  protected readonly positions = PANEL_POSITIONS;

  readonly items = input.required<readonly ColumnManagerItem[]>();

  @Output() visibilityChange = new EventEmitter<{ key: string; visible: boolean }>();
  @Output() reorder = new EventEmitter<ColumnReorderEvent>();

  protected readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.set(!this.isOpen());
  }

  close(): void {
    this.isOpen.set(false);
  }

  onToggleVisibility(item: ColumnManagerItem): void {
    if (item.locked) return;
    this.visibilityChange.emit({ key: item.key, visible: !item.visible });
  }

  onDrop(event: CdkDragDrop<unknown>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.reorder.emit({ previousIndex: event.previousIndex, currentIndex: event.currentIndex });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close();
  }
}
