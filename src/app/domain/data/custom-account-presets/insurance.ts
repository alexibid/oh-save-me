import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Seguros';

export const INSURANCE_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'life_insurance',
    category: CATEGORY,
    label: 'Seguro de Vida',
    suggestedMeasures: [
      { hint: 'premio', unit: 'EUR', label: 'Prémio' }
    ],
    suggestedDimensions: [
      { hint: 'seguradora', label: 'Seguradora' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'premio', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'dental_insurance',
    category: CATEGORY,
    label: 'Seguro Dentário',
    suggestedMeasures: [
      { hint: 'premio', unit: 'EUR', label: 'Prémio' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'premio', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'travel_insurance',
    category: CATEGORY,
    label: 'Seguro de Viagem',
    suggestedMeasures: [
      { hint: 'premio', unit: 'EUR', label: 'Prémio' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'premio', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'personal_accident_insurance',
    category: CATEGORY,
    label: 'Acidentes Pessoais',
    suggestedMeasures: [
      { hint: 'premio', unit: 'EUR', label: 'Prémio' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'premio', label: 'Total pago este ano' }
    ]
  }
];
