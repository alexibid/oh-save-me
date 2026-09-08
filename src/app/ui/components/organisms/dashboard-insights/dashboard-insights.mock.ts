import { FinancialInsight } from '@domain/models/financial-insight.model';

export const MOCK_INSIGHT_SAFE_TO_SPEND: FinancialInsight = {
  id: 'safe_to_spend',
  kind: 'safe_to_spend',
  visualArchetype: 'highlight_metric',
  icon: 'wallet',
  title: 'Daily Safe Balance',
  subtext: 'You can spend up to 42,00 €/day',
  filter: null,
  route: '/budget',
  action: null,
  payload: { value: 42 },
};
