import { RecordColumnState } from './record-column-state';
import { TRANSACTION_LIST_SCHEMA } from '@domain/models/transaction-list-schema';

describe('RecordColumnState', () => {
  let columns: RecordColumnState<never>;

  beforeEach(() => {
    columns = new RecordColumnState(TRANSACTION_LIST_SCHEMA, ['icon']);
  });

  it('offers every column except the excluded ones', () => {
    expect(columns.items().some(item => item.key === 'icon')).toBe(false);
    expect(columns.items().length).toBe(TRANSACTION_LIST_SCHEMA.columns.length - 1);
  });

  it('locks the primary columns', () => {
    const primaryKeys = TRANSACTION_LIST_SCHEMA.columns
      .filter(c => c.primary && c.key !== 'icon')
      .map(c => c.key);

    for (const key of primaryKeys) {
      expect(columns.items().find(item => item.key === key)?.locked).toBe(true);
    }
  });

  it('drops a hidden column from the schema', () => {
    const hideable = columns.items().find(item => !item.locked)!;

    columns.setVisibility(hideable.key, false);

    expect(columns.schema().columns.some(column => column.key === hideable.key)).toBe(false);
  });

  it('keeps a locked column in the schema even when asked to hide it', () => {
    const locked = columns.items().find(item => item.locked)!;

    columns.setVisibility(locked.key, false);

    expect(columns.schema().columns.some(column => column.key === locked.key)).toBe(true);
  });

  it('reflects the manager order in the schema', () => {
    const movedKey = columns.items()[2].key;

    columns.reorder({ previousIndex: 2, currentIndex: 0 });

    expect(columns.schema().columns[0].key).toBe(movedKey);
  });
});
