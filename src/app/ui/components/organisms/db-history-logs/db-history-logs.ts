import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { HistoryLog } from '@domain/models/history-log';
import { ButtonComponent, CardComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-db-history-logs',
  standalone: true,
  imports: [
    CommonModule,
    CdkTableModule,
    CardComponent,
    ButtonComponent,
    IconComponent,
    AppTranslatePipe
  ],
  styleUrl: './db-history-logs.scss',
  templateUrl: './db-history-logs.html'
})
export class DbHistoryLogsComponent {
  @Input({ required: true }) logs: HistoryLog[] = [];
  @Output() undo = new EventEmitter<string>();

  protected readonly displayedColumns = ['id', 'timestamp', 'action', 'entity', 'entityId', 'actions'];

  protected onUndo(logId: string): void {
    this.undo.emit(logId);
  }
}
