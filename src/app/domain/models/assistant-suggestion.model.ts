export type SuggestionKind =
  | 'no_accounts'
  | 'uncategorized'
  | 'pending_triage'
  | 'outlier_transactions'
  | 'category_overspend'
  | 'positive_savings'
  | 'recurring_expense'
  | 'category_needs_budget'
  | 'vacation_budget_active'
  | 'vacation_budget_ended';

export type SuggestionAction = 'open_add_entry' | 'open_vacation_detail';

export interface TransactionFilter {
  readonly pendingReview?: boolean;
  readonly uncategorized?: boolean;
  readonly amountOutlier?: boolean;
  readonly incomeOnly?: boolean;
  readonly categoryId?: string;
  readonly overspend?: boolean;
  readonly descriptionContains?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface AssistantSuggestionTemplate {
  readonly id: string;
  readonly kind: SuggestionKind;
  readonly icon: string;
  readonly questionKey: string;
  readonly subtextKey: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly filter: TransactionFilter | null;
  readonly route: string | null;
  readonly action: SuggestionAction | null;
}

export interface AssistantSuggestion {
  readonly id: string;
  readonly kind: SuggestionKind;
  readonly icon: string;
  readonly question: string;
  readonly subtext: string;
  readonly suggestedValue?: string;
  readonly valueLabel?: string;
  readonly filter: TransactionFilter | null;
  readonly route: string | null;
  readonly action: SuggestionAction | null;
}
