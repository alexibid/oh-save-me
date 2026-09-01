import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Outros';

export const MISC_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'waste_recycling_tax',
    category: CATEGORY,
    label: 'Reciclagem / Taxa de Lixo',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'laundry',
    category: CATEGORY,
    label: 'Lavandaria',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  },
  {
    id: 'miscellaneous',
    category: CATEGORY,
    label: 'Diversos',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'categoria', label: 'Categoria' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  }
];
