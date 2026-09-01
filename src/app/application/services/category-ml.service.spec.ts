import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryMlService } from './category-ml.service';
import { MlRuleRepository } from '@domain/repositories/ml-rule.repository';

describe('CategoryMlService Integration', () => {
  let service: CategoryMlService;
  let mockMlRuleRepo: Partial<MlRuleRepository>;

  beforeEach(() => {
    mockMlRuleRepo = {
      getAll: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    service = new CategoryMlService();
  });

  it('should initialize and predict default categories using Factory rules', () => {
    const category = service.predict('COMPRA PINGO DOCE LISBOA');
    expect(category).toBe('Groceries');
  });

  it('should learn user custom categories and persist rules', () => {
    service.learn('COMPRA MBWAY MARIA', 'Transfers');
    const category = service.predict('COMPRA MBWAY MARIA');
    expect(category).toBe('Transfers');
  });

  it('should allow toggling rules and resetting user memory', () => {
    service.learn('RESTAURANTE MARISQUEIRA', 'Restaurants');
    expect(service.predict('RESTAURANTE MARISQUEIRA')).toBe('Restaurants');

    service.toggleRule('restaurante marisqueira');
    expect(service.predict('RESTAURANTE MARISQUEIRA')).not.toBe('Restaurants');

    service.resetUserMemory();
    expect(service.getUserRules()).toHaveLength(0);
  });
});
