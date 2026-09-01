import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Viagens & Lazer';

export const TRAVEL_LEISURE_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'travel_budget',
    category: CATEGORY,
    label: 'Orçamento de Viagem',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'destino', label: 'Destino' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'destino', label: 'Por destino' }
    ]
  },
  {
    id: 'miles_points',
    category: CATEGORY,
    label: 'Milhas & Pontos',
    suggestedMeasures: [
      { hint: 'pontos', unit: 'EUR', label: 'Valor Equivalente' }
    ],
    suggestedDimensions: [
      { hint: 'programa', label: 'Programa' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'pontos', label: 'Valor total acumulado' }
    ]
  },
  {
    id: 'accommodation',
    category: CATEGORY,
    label: 'Alojamento',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'destino', label: 'Destino' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto' }
    ]
  },
  {
    id: 'dining_out',
    category: CATEGORY,
    label: 'Restaurantes & Saídas',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'local', label: 'Local' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'custo', label: 'Gasto mensal' }
    ]
  }
];
