import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Família & Filhos';

export const FAMILY_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'school_tuition',
    category: CATEGORY,
    label: 'Escola & Propinas',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'filho', label: 'Filho(a)' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este ano' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'filho', label: 'Por filho(a)' }
    ]
  },
  {
    id: 'tutoring',
    category: CATEGORY,
    label: 'Explicações',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'disciplina', label: 'Disciplina' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  },
  {
    id: 'daycare',
    category: CATEGORY,
    label: 'Creche / ATL',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este mês' }
    ]
  },
  {
    id: 'kids_allowance',
    category: CATEGORY,
    label: 'Mesada dos Filhos',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'filho', label: 'Filho(a)' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Total pago este mês' }
    ]
  },
  {
    id: 'school_supplies',
    category: CATEGORY,
    label: 'Material Escolar',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'extracurricular_activities',
    category: CATEGORY,
    label: 'Atividades Extracurriculares',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'atividade', label: 'Atividade' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'atividade', label: 'Por atividade' }
    ]
  }
];
