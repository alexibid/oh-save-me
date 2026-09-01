import { buildActiveFilterChips } from './active-filter-chips.utils';

describe('buildActiveFilterChips', () => {
  it('returns nothing when no filter is active', () => {
    expect(buildActiveFilterChips({})).toEqual([]);
  });

  it('keeps account, category, project and date order', () => {
    const chips = buildActiveFilterChips({
      account: { name: 'Conta Ordenado' },
      category: { label: 'Supermercado e Compras', color: '#10b981' },
      project: { name: 'Férias de Verão' },
      dateRange: { start: '2026-08-01', end: '2026-08-31' }
    });

    expect(chips.map(chip => chip.id)).toEqual(['account', 'category', 'project', 'dates']);
  });

  it('carries the category color so the chip can match the category', () => {
    const [chip] = buildActiveFilterChips({ category: { label: 'Supermercado e Compras', color: '#10b981' } });

    expect(chip).toEqual({ id: 'category', label: 'Supermercado e Compras', color: '#10b981' });
  });

  it('renders specialFilter, search query and overspend as chips', () => {
    const chips = buildActiveFilterChips({
      specialFilter: { label: 'Por Rever' },
      search: 'Continente',
      overspend: true
    });

    expect(chips).toEqual([
      { id: 'special', label: 'Por Rever' },
      { id: 'search', label: '"Continente"' },
      { id: 'overspend', label: 'Excesso de Orçamento' }
    ]);
  });

  it('renders the date range as a single chip', () => {
    const [chip] = buildActiveFilterChips({ dateRange: { start: '2026-08-01', end: '2026-08-31' } });

    expect(chip.label).toBe('2026-08-01 → 2026-08-31');
  });
});
