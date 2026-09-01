import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Casa & Utilities';

export const HOME_UTILITIES_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'electricity_bill',
    category: CATEGORY,
    label: 'Fatura de Eletricidade',
    suggestedMeasures: [
      { hint: 'consumo', unit: 'kWh', label: 'Consumo' },
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'consumo', label: 'Consumo mensal' }
    ]
  },
  {
    id: 'water_bill',
    category: CATEGORY,
    label: 'Fatura de Água',
    suggestedMeasures: [
      { hint: 'consumo', unit: 'M3', label: 'Consumo' },
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'consumo', label: 'Consumo mensal' }
    ]
  },
  {
    id: 'gas_bill',
    category: CATEGORY,
    label: 'Fatura de Gás',
    suggestedMeasures: [
      { hint: 'consumo', unit: 'M3', label: 'Consumo' },
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'consumo', label: 'Consumo mensal' }
    ]
  },
  {
    id: 'internet_tv',
    category: CATEGORY,
    label: 'Internet & TV',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'operadora', label: 'Operadora' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'custo', label: 'Gasto mensal' }
    ]
  },
  {
    id: 'phone_bill',
    category: CATEGORY,
    label: 'Telemóvel',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'operadora', label: 'Operadora' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' }
    ]
  },
  {
    id: 'rent',
    category: CATEGORY,
    label: 'Renda de Casa',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Total pago este ano' },
      { kind: 'trend', measureHint: 'valor', label: 'Evolução mensal' }
    ]
  },
  {
    id: 'mortgage',
    category: CATEGORY,
    label: 'Crédito Habitação',
    suggestedMeasures: [
      { hint: 'prestacao', unit: 'EUR', label: 'Prestação' },
      { hint: 'juros', unit: 'EUR', label: 'Juros' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'prestacao', label: 'Total pago este ano' },
      { kind: 'trend', measureHint: 'juros', label: 'Evolução dos juros' }
    ]
  },
  {
    id: 'condo_fees',
    category: CATEGORY,
    label: 'Condomínio',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este ano' }
    ]
  },
  {
    id: 'home_insurance',
    category: CATEGORY,
    label: 'Seguro de Casa',
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
    id: 'home_renovation',
    category: CATEGORY,
    label: 'Obras & Renovação',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'divisao', label: 'Divisão / Área' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'divisao', label: 'Custo por divisão' }
    ]
  },
  {
    id: 'home_furniture',
    category: CATEGORY,
    label: 'Mobiliário & Decoração',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'loja', label: 'Loja' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto' }
    ]
  },
  {
    id: 'home_security',
    category: CATEGORY,
    label: 'Segurança / Alarme',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este ano' }
    ]
  }
];
