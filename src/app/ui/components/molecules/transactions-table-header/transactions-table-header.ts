import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TableSortField, TableTab } from '@domain/models/record-list';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { DetectStickyDirective } from '@ui/shared/detect-sticky.directive';
import {
  CollectionHeaderComponent,
  IconToggleComponent,
  SegmentOption,
  SortButtonComponent
} from 'ibid-ui';

@Component({
  selector: 'ohsaveme-transactions-table-header',
  standalone: true,
  imports: [
    ...I18N_SHARED,
    DetectStickyDirective,
    CollectionHeaderComponent,
    IconToggleComponent,
    SortButtonComponent
  ],
  templateUrl: './transactions-table-header.html',
  styleUrl: './transactions-table-header.scss'
})
export class TransactionsTableHeaderComponent {
  @Input() showTitle = true;
  @Input() showSearch = false;
  @Input() showTabs = true;
  @Input() showSort = true;
  @Input() showSumToggle = false;
  @Input() selectionMode = false;
  @Input() sumModeEnabled = false;
  @Input() searchQuery = '';
  @Input({ required: true }) activeTab!: TableTab;
  @Input({ required: true }) tabOptions!: readonly SegmentOption[];
  @Input() sortField: TableSortField | null = null;
  @Input() sortDirection: 'asc' | 'desc' = 'desc';

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() sumModeChange = new EventEmitter<boolean>();
  @Output() tabChange = new EventEmitter<string>();
  @Output() sortToggle = new EventEmitter<TableSortField>();

  protected readonly isSticky = signal<boolean>(false);
}
