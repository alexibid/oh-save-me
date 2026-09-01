import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Saúde & Bem-Estar';

export const HEALTH_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'gym',
    category: CATEGORY,
    label: 'Ginásio',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'health_insurance',
    category: CATEGORY,
    label: 'Seguro de Saúde',
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
    id: 'medication',
    category: CATEGORY,
    label: 'Medicação',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'farmacia', label: 'Farmácia' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'custo', label: 'Gasto mensal' }
    ]
  },
  {
    id: 'therapy',
    category: CATEGORY,
    label: 'Consultas & Terapia',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'especialidade', label: 'Especialidade' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'especialidade', label: 'Por especialidade' }
    ]
  },
  {
    id: 'glasses_lenses',
    category: CATEGORY,
    label: 'Óculos & Lentes',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'dentist',
    category: CATEGORY,
    label: 'Dentista',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'physiotherapy',
    category: CATEGORY,
    label: 'Fisioterapia',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'supplements',
    category: CATEGORY,
    label: 'Suplementos',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  }
];
