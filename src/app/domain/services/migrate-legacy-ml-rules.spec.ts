import { migrateLegacyMlRules } from './migrate-legacy-ml-rules';
import { MlRuleRepository } from '@domain/repositories/ml-rule.repository';
import { MlRule } from '@domain/models/ml-rule';

describe('migrateLegacyMlRules', () => {
  let upserted: MlRule[];
  let repository: MlRuleRepository;

  beforeEach(() => {
    localStorage.clear();
    upserted = [];
    repository = {
      getAll: async () => [],
      upsert: async (rule: Readonly<MlRule>) => { upserted.push(rule); },
      delete: async () => { },
      clear: async () => { }
    };
  });

  it('does nothing when no legacy keys exist', async () => {
    await migrateLegacyMlRules(repository);
    expect(upserted).toEqual([]);
  });

  it('migrates user-learned weights into enabled rules', async () => {
    localStorage.setItem(
      'app_app_user_ml_weights',
      JSON.stringify({ 'uber eats': { Restaurants: 5 } })
    );

    await migrateLegacyMlRules(repository);

    expect(upserted).toHaveLength(1);
    expect(upserted[0].key).toBe('uber eats');
    expect(upserted[0].categoryWeights).toEqual({ Restaurants: 5 });
    expect(upserted[0].enabled).toBe(true);
  });

  it('migrates disabled rule keys not present in weights as suppression-only rules', async () => {
    localStorage.setItem('app_app_disabled_ml_rules', JSON.stringify(['lidl']));

    await migrateLegacyMlRules(repository);

    expect(upserted).toHaveLength(1);
    expect(upserted[0]).toMatchObject({ key: 'lidl', enabled: false });
    expect(upserted[0].categoryWeights).toBeUndefined();
  });

  it('merges a disabled key that also has learned weights', async () => {
    localStorage.setItem(
      'app_app_user_ml_weights',
      JSON.stringify({ pingo: { Groceries: 5 } })
    );
    localStorage.setItem('app_app_disabled_ml_rules', JSON.stringify(['pingo']));

    await migrateLegacyMlRules(repository);

    expect(upserted).toHaveLength(1);
    expect(upserted[0]).toMatchObject({ key: 'pingo', enabled: false, categoryWeights: { Groceries: 5 } });
  });

  it('clears the legacy localStorage keys after a successful migration', async () => {
    localStorage.setItem('app_app_user_ml_weights', JSON.stringify({ lidl: { Groceries: 5 } }));
    localStorage.setItem('app_app_disabled_ml_rules', JSON.stringify(['lidl']));

    await migrateLegacyMlRules(repository);

    expect(localStorage.getItem('app_app_user_ml_weights')).toBeNull();
    expect(localStorage.getItem('app_app_disabled_ml_rules')).toBeNull();
  });
});
