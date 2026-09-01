import { BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS } from './bootstrap-column-classifier-weights';
import { COLUMN_CLASSIFIER_CLASSES } from '@domain/models/column-classifier-model';
import { COLUMN_FEATURE_NAMES } from '@domain/services/column-classifier-features';
import { predictProbabilities } from '@domain/services/column-classifier-math';

describe('BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS shape invariants', () => {
  it('has one row per classifier class', () => {
    expect(BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS.matrix.length).toBe(COLUMN_CLASSIFIER_CLASSES.length);
  });

  it('has one column per declared feature, in every row', () => {
    BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS.matrix.forEach(row => {
      expect(row.length).toBe(COLUMN_FEATURE_NAMES.length);
    });
  });

  it('contains no NaN or Infinity entries (a regenerated constant with a stale/diverged script would produce these)', () => {
    BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS.matrix.forEach(row => {
      row.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
      });
    });
  });

  it('has a featureVersion matching the current feature vector length', () => {
    expect(BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS.featureVersion).toBeGreaterThan(0);
  });

  it('produces a valid probability distribution for an arbitrary feature vector', () => {
    const features = COLUMN_FEATURE_NAMES.map(() => 0.5);
    const probabilities = predictProbabilities(BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS, features);

    expect(probabilities.length).toBe(COLUMN_CLASSIFIER_CLASSES.length);
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});
