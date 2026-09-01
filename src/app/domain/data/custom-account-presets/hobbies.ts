import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Hobbies & Desporto';

export const HOBBIES_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'sports_equipment',
    category: CATEGORY,
    label: 'Equipamento Desportivo',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'modalidade', label: 'Modalidade' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'musical_instruments',
    category: CATEGORY,
    label: 'Instrumentos Musicais',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'sports_club_fee',
    category: CATEGORY,
    label: 'Clube / Quota Desportiva',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'clube', label: 'Clube' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'hobby_supplies',
    category: CATEGORY,
    label: 'Material de Hobby',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'hobby', label: 'Hobby' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  }
];
