import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryMlService } from './category-ml.service';

describe('CategoryMlService Integration', () => {
  let service: CategoryMlService;

  beforeEach(() => {
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
