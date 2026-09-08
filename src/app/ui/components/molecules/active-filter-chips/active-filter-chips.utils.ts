import { ActiveFilterChip } from './active-filter-chips';

export interface ActiveFilterSelection {
  readonly account?: { readonly name: string };
  readonly category?: { readonly label: string; readonly color?: string };
  readonly project?: { readonly name: string };
  readonly specialFilter?: { readonly label: string };
  readonly search?: string;
  readonly overspend?: { readonly label: string };
  readonly dateRange?: { readonly start: string; readonly end: string };
}

export function buildActiveFilterChips(selection: ActiveFilterSelection): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (selection.specialFilter) chips.push({ id: 'special', label: selection.specialFilter.label });
  if (selection.account) chips.push({ id: 'account', label: selection.account.name });
  if (selection.category) chips.push({ id: 'category', label: selection.category.label, color: selection.category.color });
  if (selection.project) chips.push({ id: 'project', label: selection.project.name });
  if (selection.search) chips.push({ id: 'search', label: `"${selection.search}"` });
  if (selection.overspend) chips.push({ id: 'overspend', label: selection.overspend.label });
  if (selection.dateRange) chips.push({ id: 'dates', label: `${selection.dateRange.start} → ${selection.dateRange.end}` });

  return chips;
}
