import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Animais de Estimação';

export const PETS_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'pet_food',
    category: CATEGORY,
    label: 'Alimentação Animal',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'animal', label: 'Animal' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  },
  {
    id: 'vet',
    category: CATEGORY,
    label: 'Veterinário',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'animal', label: 'Animal' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'animal', label: 'Por animal' }
    ]
  },
  {
    id: 'pet_insurance',
    category: CATEGORY,
    label: 'Seguro de Animal',
    suggestedMeasures: [
      { hint: 'premio', unit: 'EUR', label: 'Prémio' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'premio', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'pet_grooming',
    category: CATEGORY,
    label: 'Grooming & Higiene',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  }
];
