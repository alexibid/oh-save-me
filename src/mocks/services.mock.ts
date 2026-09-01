import { signal } from '@angular/core';
import { vi } from 'vitest';

export const createMockI18nService = (overrides?: Record<string, unknown>) => ({
  currentLang: signal('pt'),
  formatCurrency: (v: number) => `${v.toFixed(2)} €`,
  formatDate: (d: string) => d,
  translate: (k: string, fallback?: string) => fallback ?? k,
  t: () => ({
    dbHistoryTitle: 'Histórico de Alterações e Undo',
    dbHistoryEmpty: 'Nenhuma alteração recente registada para Undo.',
    dbUndo: 'Desfazer',
    dbHistoryTransaction: 'Movimento',
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
