import { Transaction } from '@domain/models/transaction';

function normalizeForSimilarity(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function isDateLikeToken(word: string): boolean {
  return /^\d{1,2}(\/\d{1,2})?\/\d{2,4}$/.test(word);
}

export function defaultSimilarityKeyword(description: string): string {
  const words = description.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  const meaningfulWords = lastWord && isDateLikeToken(lastWord) ? words.slice(0, -1) : words;
  return meaningfulWords.length <= 2 ? meaningfulWords.join(' ') : meaningfulWords.slice(-2).join(' ');
}

export function matchesSimilarityKeyword(description: string, keyword: string): boolean {
  const normalizedKeyword = normalizeForSimilarity(keyword).trim();
  if (normalizedKeyword.length < 2) return false;
  return normalizeForSimilarity(description).includes(normalizedKeyword);
}

export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function hasConsistentAmount(transactions: readonly Transaction[], toleranceRatio: number): boolean {
  const amounts = transactions.map(t => Math.abs(t.amount));
  const average = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  return amounts.every(a => Math.abs(a - average) <= average * toleranceRatio);
}
