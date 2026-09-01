import { SuggestionAction, SuggestionKind, TransactionFilter } from './assistant-suggestion.model';
import { AssistantAnswerOptions, AssistantTaskAction, AssistantTaskKind } from './assistant-task.model';

export type AssistantCardKind = SuggestionKind | AssistantTaskKind;
export type AssistantCardAction = SuggestionAction | AssistantTaskAction;

export interface AssistantCard {
  readonly id: string;
  readonly kind: AssistantCardKind;
  readonly icon: string;
  readonly question: string;
  readonly subtext: string;
  readonly suggestedValue?: string;
  readonly valueLabel?: string;
  readonly targetId?: string;
  readonly filter: TransactionFilter | null;
  readonly route: string | null;
  readonly action: AssistantCardAction | null;
  readonly answer?: AssistantAnswerOptions;
}

export interface AssistantAnswer {
  readonly card: AssistantCard;
  readonly confirmed: boolean;
}

export function toAssistantCard(task: {
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
}): AssistantCard {
  return {
    id: task.id,
    kind: task.kind,
    icon: task.icon,
    question: task.title,
    subtext: task.subtext,
    targetId: task.targetId,
    filter: task.filter,
    route: task.route,
    action: task.action,
    answer: task.answer,
  };
}
