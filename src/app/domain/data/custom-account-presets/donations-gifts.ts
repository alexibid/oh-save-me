import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Doações & Presentes';

export const DONATIONS_GIFTS_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'donations_charity',
    category: CATEGORY,
    label: 'Doações & Caridade',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'instituicao', label: 'Instituição' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Total doado este ano' },
      { kind: 'breakdown', measureHint: 'valor', dimensionHint: 'instituicao', label: 'Por instituição' }
    ]
  },
  {
    id: 'gifts',
    category: CATEGORY,
    label: 'Presentes',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'ocasiao', label: 'Ocasião' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'ocasiao', label: 'Por ocasião' }
    ]
  }
];
