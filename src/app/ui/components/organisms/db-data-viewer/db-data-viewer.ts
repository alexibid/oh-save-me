import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { DatabaseRow } from '@ui/pages/database/database-row';
import { Account } from '@domain/models/account';
import { Budget } from '@domain/models/budget';
import { CategoryInfo } from '@domain/models/category';
import { Transaction } from '@domain/models/transaction';
import { I18nService } from '@application/i18n.service';
import { ButtonComponent, CardComponent, IconButtonComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-db-data-viewer',
  standalone: true,
  imports: [
    CardComponent,
    ButtonComponent,
    IconButtonComponent,
    IconComponent,
    AppTranslatePipe
],
  styleUrl: './db-data-viewer.scss',
  templateUrl: './db-data-viewer.html'
})
export class DbDataViewerComponent {
  private readonly i18n = inject(I18nService);

  @Input() dbName = '';
  @Input() friendlyName = '';
  @Input() rows: DatabaseRow[] = [];
  @Input() accountsData: readonly Account[] = [];
  @Input() transactionsData: readonly Transaction[] = [];
  @Input() categoriesData: readonly CategoryInfo[] = [];
  @Input() budgetsData: readonly Budget[] = [];
  @Input() activeTab: 'accounts' | 'transactions' | 'categories' | 'budgets' = 'transactions';

  @Output() closed = new EventEmitter<void>();
  @Output() undo = new EventEmitter<string>();
  @Output() restore = new EventEmitter<DatabaseRow>();
  @Output() tabChange = new EventEmitter<'accounts' | 'transactions' | 'categories' | 'budgets'>();

  protected readonly displayedDataColumns = ['id', 'details', 'actions'];

  protected getRowDetails(row: object): string {
    if (!row) return '-';
    const entries = Object.entries(row)
      .filter(([key]) => key !== 'id' && key !== '_rev' && key !== '_deleted');
    return entries.slice(0, 4).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ');
  }

  protected switchTab(tab: 'accounts' | 'transactions' | 'categories' | 'budgets'): void {
    this.tabChange.emit(tab);
  }
}
