export interface HistoryLog {
  readonly id: string;
  readonly timestamp: string;
  readonly action: 'INSERT' | 'UPDATE' | 'DELETE';
  readonly entity: 'transaction' | 'category' | 'budget' | 'customization';
  readonly entityId: string;
  readonly oldValue?: string;
  readonly newValue?: string;
}
