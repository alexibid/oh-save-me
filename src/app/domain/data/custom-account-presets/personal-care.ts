import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Roupa & Cuidado Pessoal';

export const PERSONAL_CARE_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'clothing',
    category: CATEGORY,
    label: 'Vestuário',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'loja', label: 'Loja' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'custo', label: 'Gasto mensal' }
    ]
  },
  {
    id: 'hairdresser_aesthetics',
    category: CATEGORY,
    label: 'Cabeleireiro & Estética',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'hygiene_products',
    category: CATEGORY,
    label: 'Produtos de Higiene',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  }
];
