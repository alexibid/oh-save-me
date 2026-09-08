import { signal } from '@angular/core';
import { vi } from 'vitest';

export const createMockI18nService = (overrides?: Record<string, unknown>) => ({
  currentLang: signal('pt'),
  formatCurrency: (v: number) => `${v.toFixed(2)} €`,
  formatDate: (d: string) => d,
  translate: (k: string, fallback?: string) => fallback ?? k,
  t: () => ({
    dbHistoryTitle: 'Change History and Undo',
    dbHistoryEmpty: 'No recent change recorded for Undo.',
    dbUndo: 'Desfazer',
    dbHistoryTransaction: 'Movement',
    currencyConfig: { symbol: '€', position: 'right' },
    formatCurrency: (v: number) => `${v.toFixed(2)} €`
  }),
  getCategoryName: (id: string) => id,
  ...overrides
});

export const createMockCategoryMlService = (overrides?: Record<string, unknown>) => ({
  loadRules: vi.fn().mockResolvedValue(undefined),
  learn: vi.fn(),
  suggestCategory: vi.fn().mockReturnValue(null),
  categorizeBatch: vi.fn().mockResolvedValue([]),
  ...overrides
});

export const createMockCsvParser = (overrides?: Record<string, unknown>) => ({
  parse: vi.fn().mockResolvedValue([]),
  ...overrides
});
