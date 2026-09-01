import { FinancialInsight } from '@domain/models/financial-insight.model';

export const MOCK_INSIGHT_SAFE_TO_SPEND: FinancialInsight = {
  id: 'safe_to_spend',
  kind: 'safe_to_spend',
  visualArchetype: 'highlight_metric',
  icon: 'wallet',
  title: 'Saldo Seguro Diário',
  subtext: 'Podes gastar até 42,00 €/dia',
  filter: null,
  route: '/budget',
  action: null,
  payload: { value: 42 },
};
