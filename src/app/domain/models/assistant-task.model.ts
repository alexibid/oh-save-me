import { TransactionFilter } from './assistant-suggestion.model';

export type AssistantTaskKind =
  | 'no_accounts'
  | 'pending_triage'
  | 'uncategorized'
  | 'category_needs_budget'
  | 'duplicate_charge'
  | 'unmatched_transfer'
  | 'vacation_budget_ended'
  | 'confirm_recurring'
  | 'confirm_salary'
  | 'broker_transfer'
  | 'broker_idle_cash'
  | 'structural_surplus'
  | 'stale_asset_revaluation'
  | 'target_profit_reached';

export type AssistantTaskAction =
  | 'open_add_entry'
  | 'open_vacation_detail'
  | 'open_reconcile_dialog'
  | 'open_sell_simulator';

export type AssistantAnswerKind =
  | 'confirm_recurring'
  | 'confirm_duplicate'
  | 'confirm_transfer_link'
  | 'close_project'
  | 'confirm_salary'
  | 'associate_asset'
  | 'broker_cash_policy'
  | 'create_savings_goal'
  | 'confirm_asset_value'
  | 'simulate_sell'
  | 'adjust_target_price'
  | 'keep_position';

export interface AssistantAnswerOptions {
  readonly kind: AssistantAnswerKind;
  readonly acceptLabelKey: string;
  readonly rejectLabelKey: string;
}

export interface OperationalTaskTemplate {
  readonly id: string;
  readonly kind: AssistantTaskKind;
  readonly icon: string;
  readonly titleKey: string;
  readonly subtextKey: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly filter: TransactionFilter | null;
  readonly route: string | null;
  readonly action: AssistantTaskAction | null;
  readonly answer?: AssistantAnswerOptions;
}

export interface OperationalTask {
  readonly id: string;
  readonly kind: AssistantTaskKind;
  readonly icon: string;
  readonly title: string;
  readonly subtext: string;
  readonly targetId?: string;
  readonly filter: TransactionFilter | null;
  readonly route: string | null;
  readonly action: AssistantTaskAction | null;
  readonly answer?: AssistantAnswerOptions;
}
