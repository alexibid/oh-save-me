import { CategoryType, TEMPLATE_CATEGORIES } from '@domain/models/category';
import { FACTORY_WEIGHTS } from '@domain/data/factory-weights';
import { normalizeText } from '@ibid/utils';

export function createEmptyCategoryRecord(): Record<CategoryType, number> {
  const record = {} as Record<CategoryType, number>;
  TEMPLATE_CATEGORIES.forEach(cat => {
    record[cat.id] = 0;
  });
  return record;
}

export function calculateLearnKey(description: string): string {
  const normalized = normalizeText(description);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return words.length <= 2 ? words.join(' ') : words.slice(-2).join(' ');
}

export function predictCategory(
  description: string,
  userWeights: Record<string, Record<CategoryType, number>>,
  disabledRules: ReadonlySet<string>,
  isRefund = false
): CategoryType {
  const normalizedDesc = normalizeText(description);

  const userScore = createEmptyCategoryRecord();
  let hasUserMatch = false;

  Object.entries(userWeights).forEach(([ruleKey, catWeights]) => {
    if (!disabledRules.has(ruleKey) && normalizedDesc.includes(ruleKey)) {
      Object.entries(catWeights).forEach(([cat, val]) => {
        if (val > 0) {
          userScore[cat as CategoryType] += val;
          hasUserMatch = true;
        }
      });
    }
  });

  if (hasUserMatch) {
    let bestUserCategory: CategoryType = 'Others';
    let maxUserScore = 0;
    Object.entries(userScore).forEach(([cat, val]) => {
      const category = cat as CategoryType;
      if (isRefund && category === 'Income') return;
      if (val > maxUserScore) {
        maxUserScore = val;
        bestUserCategory = category;
      }
    });
    if (maxUserScore > 0) {
      return bestUserCategory;
    }
  }

  const score = createEmptyCategoryRecord();
  Object.entries(FACTORY_WEIGHTS).forEach(([ruleKey, catWeights]) => {
    if (!disabledRules.has(ruleKey) && normalizedDesc.includes(ruleKey)) {
      Object.entries(catWeights).forEach(([cat, val]) => {
        score[cat as CategoryType] += val || 0;
      });
    }
  });

  let bestCategory: CategoryType = 'Others';
  let maxScore = -1;

  Object.entries(score).forEach(([cat, val]) => {
    const category = cat as CategoryType;
    if (isRefund && category === 'Income') return;
    if (val > maxScore) {
      maxScore = val;
      bestCategory = category;
    }
  });

  if (maxScore <= 0) {
    return 'Others';
  }

  return bestCategory;
}

export function extractUserRules(
  weights: Record<string, Record<CategoryType, number>>,
  disabled: ReadonlySet<string>
): { readonly token: string; readonly category: CategoryType; readonly enabled: boolean }[] {
  const rules: { token: string; category: CategoryType; enabled: boolean }[] = [];

  Object.entries(weights).forEach(([token, catScores]) => {
    let bestCategory: CategoryType | null = null;
    let maxScore = 0;

    Object.entries(catScores).forEach(([cat, score]) => {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = cat as CategoryType;
      }
    });

    if (bestCategory && maxScore > 0) {
      rules.push({ token, category: bestCategory, enabled: !disabled.has(token) });
    }
  });

  return rules;
}

export function extractGenericRules(
  disabled: ReadonlySet<string>
): { readonly token: string; readonly category: CategoryType; readonly enabled: boolean }[] {
  const rules: { token: string; category: CategoryType; enabled: boolean }[] = [];

  Object.entries(FACTORY_WEIGHTS).forEach(([token, catScores]) => {
    let bestCategory: CategoryType | null = null;
    let maxScore = 0;

    Object.entries(catScores).forEach(([cat, score]) => {
      if (score && score > maxScore) {
        maxScore = score;
        bestCategory = cat as CategoryType;
      }
    });

    if (bestCategory) {
      rules.push({ token, category: bestCategory, enabled: !disabled.has(token) });
    }
  });

  return rules;
}
