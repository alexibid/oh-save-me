import { Signal, computed, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { RecordListSchema } from '@domain/models/record-list-schema';
import { ColumnManagerItem, ColumnReorderEvent } from '@ui/components/molecules/column-manager-panel/column-manager-panel';

export class RecordColumnState<T> {
  readonly items = signal<ColumnManagerItem[]>([]);
  readonly schema: Signal<RecordListSchema<T>>;

  constructor(
    private readonly baseSchema: RecordListSchema<T>,
    excludedKeys: readonly string[] = []
  ) {
    this.items.set(
      baseSchema.columns
        .filter(column => !excludedKeys.includes(column.key))
        .map(column => ({ key: column.key, labelKey: column.labelKey, visible: true, locked: column.primary }))
    );

    this.schema = computed(() => ({
      ...this.baseSchema,
      columns: this.items()
        .filter(item => item.locked || item.visible)
        .flatMap(item => {
          const column = this.baseSchema.columns.find(candidate => candidate.key === item.key);
          return column ? [column] : [];
        })
    }));
  }

  setVisibility(key: string, visible: boolean): void {
    this.items.update(items => items.map(item => item.key === key ? { ...item, visible } : item));
  }

  reorder(event: ColumnReorderEvent): void {
    const reordered = [...this.items()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.items.set(reordered);
  }
}
