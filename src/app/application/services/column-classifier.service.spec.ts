import { describe, it, expect } from 'vitest';
import { ColumnClassifierService } from './column-classifier.service';
import { BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS } from '@domain/data/bootstrap-column-classifier-weights';

describe('ColumnClassifierService', () => {
  it('should initialize with bootstrap weights', () => {
    const service = new ColumnClassifierService();
    expect(service.getWeights()).toEqual(BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS);
  });

  it('should reset weights to bootstrap state', () => {
    const service = new ColumnClassifierService();
    service.resetToBootstrap();
    expect(service.getWeights()).toEqual(BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS);
  });
});
