import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { I18nService } from '@application/i18n.service';
import { ButtonComponent, CardComponent, IconButtonComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-db-data-viewer',
  standalone: true,
  imports: [
    CommonModule,
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
  @Input() rows: any[] = [];
  @Input() accountsData: any[] = [];
  @Input() transactionsData: any[] = [];
  @Input() categoriesData: any[] = [];
  @Input() budgetsData: any[] = [];
  @Input() activeTab: 'accounts' | 'transactions' | 'categories' | 'budgets' = 'transactions';

  @Output() close = new EventEmitter<void>();
  @Output() undo = new EventEmitter<string>();
  @Output() restore = new EventEmitter<any>();
  @Output() tabChange = new EventEmitter<'accounts' | 'transactions' | 'categories' | 'budgets'>();

  protected readonly displayedDataColumns = ['id', 'details', 'actions'];

  protected getRowDetails(row: any): string {
    if (!row) return '-';
    const keys = Object.keys(row).filter(k => k !== 'id' && k !== '_rev' && k !== '_deleted');
    return keys.slice(0, 4).map(k => `${k}: ${JSON.stringify(row[k])}`).join(', ');
  }

  protected switchTab(tab: 'accounts' | 'transactions' | 'categories' | 'budgets'): void {
    this.tabChange.emit(tab);
  }
}
