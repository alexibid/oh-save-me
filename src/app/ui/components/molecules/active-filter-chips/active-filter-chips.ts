import { Component, EventEmitter, Output, input } from '@angular/core';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { IconComponent } from 'ibid-ui';

export interface ActiveFilterChip {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
}

@Component({
  selector: 'ohsaveme-active-filter-chips',
  standalone: true,
  imports: [IconComponent, I18N_SHARED],
  templateUrl: './active-filter-chips.html',
  styleUrl: './active-filter-chips.scss'
})
export class ActiveFilterChipsComponent {
  readonly chips = input<readonly ActiveFilterChip[]>([]);

  @Output() remove = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();
}
