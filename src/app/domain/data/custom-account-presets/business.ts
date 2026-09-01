import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Negócio & Freelance';

export const BUSINESS_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'business_expenses',
    category: CATEGORY,
    label: 'Despesas de Negócio',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'categoria', label: 'Categoria' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'categoria', label: 'Por categoria' }
    ]
  },
  {
    id: 'freelance_income',
    category: CATEGORY,
    label: 'Faturação / Receita Freelance',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'cliente', label: 'Cliente' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Total faturado este mês' },
      { kind: 'trend', measureHint: 'valor', label: 'Faturação mensal' },
      { kind: 'breakdown', measureHint: 'valor', dimensionHint: 'cliente', label: 'Por cliente' }
    ]
  },
  {
    id: 'work_equipment',
    category: CATEGORY,
    label: 'Equipamento de Trabalho',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' }
    ]
  },
  {
    id: 'business_taxes',
    category: CATEGORY,
    label: 'Impostos (IVA/IRS)',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'tipo', label: 'Tipo de Imposto' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Total pago este ano' }
    ]
  }
];
