import { TransactionSumSelection } from './transaction-sum-selection';

describe('TransactionSumSelection', () => {
  let selection: TransactionSumSelection;

  beforeEach(() => {
    selection = new TransactionSumSelection();
  });

  it('starts disabled and empty', () => {
    expect(selection.enabled()).toBe(false);
    expect(selection.selectedIds().size).toBe(0);
  });

  it('drops the selection when sum mode is turned off', () => {
    selection.setEnabled(true);
    selection.select('tx-1', true);

    selection.setEnabled(false);

    expect(selection.selectedIds().size).toBe(0);
  });

  it('toggles a single transaction in and out', () => {
    selection.toggle('tx-1');
    expect(selection.isSelected('tx-1')).toBe(true);

    selection.toggle('tx-1');
    expect(selection.isSelected('tx-1')).toBe(false);
  });

  it('replaces the whole selection when selecting all', () => {
    selection.select('tx-9', true);

    selection.selectAll(['tx-1', 'tx-2']);

    expect(selection.selectedIds()).toEqual(new Set(['tx-1', 'tx-2']));
  });

  it('reports all-selected only for a non-empty fully ticked list', () => {
    expect(selection.areAllSelected([])).toBe(false);

    selection.selectAll(['tx-1', 'tx-2']);

    expect(selection.areAllSelected(['tx-1', 'tx-2'])).toBe(true);
    expect(selection.areAllSelected(['tx-1', 'tx-3'])).toBe(false);
  });
});
