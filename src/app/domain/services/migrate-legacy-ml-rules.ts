import { CategoryType } from '@domain/models/category';
import { MlRule } from '@domain/models/ml-rule';
import { MlRuleRepository } from '@domain/repositories/ml-rule.repository';

const LEGACY_WEIGHTS_KEY = 'app_app_user_ml_weights';
const LEGACY_DISABLED_KEY = 'app_app_disabled_ml_rules';

export async function migrateLegacyMlRules(repository: MlRuleRepository): Promise<void> {
  if (typeof window === 'undefined') return;

  const storedWeights = localStorage.getItem(LEGACY_WEIGHTS_KEY);
  const storedDisabled = localStorage.getItem(LEGACY_DISABLED_KEY);
  if (!storedWeights && !storedDisabled) return;

  const rules = buildLegacyRules(storedWeights, storedDisabled);
  for (const rule of rules.values()) {
    await repository.upsert(rule);
  }

  localStorage.removeItem(LEGACY_WEIGHTS_KEY);
  localStorage.removeItem(LEGACY_DISABLED_KEY);
}

function buildLegacyRules(
  storedWeights: string | null,
  storedDisabled: string | null
): Map<string, MlRule> {
  const rules = new Map<string, MlRule>();
  const now = Date.now();

  if (storedWeights) {
    const weights = JSON.parse(storedWeights) as Record<string, Record<CategoryType, number>>;
    Object.entries(weights).forEach(([key, categoryWeights]) => {
      rules.set(key, { key, categoryWeights, enabled: true, updatedAt: now });
    });
  }

  if (storedDisabled) {
    const disabled = JSON.parse(storedDisabled) as string[];
    disabled.forEach(key => {
      const existing = rules.get(key);
      rules.set(key, existing ? { ...existing, enabled: false } : { key, enabled: false, updatedAt: now });
    });
  }

  return rules;
}
