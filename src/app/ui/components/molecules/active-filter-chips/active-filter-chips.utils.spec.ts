import { buildActiveFilterChips } from './active-filter-chips.utils';

describe('buildActiveFilterChips', () => {
  it('returns nothing when no filter is active', () => {
    expect(buildActiveFilterChips({})).toEqual([]);
  });

  it('keeps account, category, project and date order', () => {
    const chips = buildActiveFilterChips({
      account: { name: 'Salary Account' },
      category: { label: 'Supermercado e Compras', color: '#10b981' },
      project: { name: 'Summer Holiday' },
      dateRange: { start: '2026-08-01', end: '2026-08-31' }
    });

    expect(chips.map(chip => chip.id)).toEqual(['account', 'category', 'project', 'dates']);
  });

  it('carries the category color so the chip can match the category', () => {
    const [chip] = buildActiveFilterChips({ category: { label: 'Supermarket and Shopping', color: '#10b981' } });

    expect(chip).toEqual({ id: 'category', label: 'Supermarket and Shopping', color: '#10b981' });
  });

  it('renders specialFilter, search query and overspend as chips', () => {
    const chips = buildActiveFilterChips({
      specialFilter: { label: 'To Review' },
      search: 'Continente',
      overspend: { label: 'Over budget' }
    });

    expect(chips).toEqual([
      { id: 'special', label: 'To Review' },
      { id: 'search', label: '"Continente"' },
      { id: 'overspend', label: 'Over budget' }
    ]);
  });

  it('renders the date range as a single chip', () => {
    const [chip] = buildActiveFilterChips({ dateRange: { start: '2026-08-01', end: '2026-08-31' } });

    expect(chip.label).toBe('2026-08-01 → 2026-08-31');
  });
});
