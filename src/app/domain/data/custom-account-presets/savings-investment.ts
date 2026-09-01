import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Poupança & Investimento';

export const SAVINGS_INVESTMENT_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'ppr',
    category: CATEGORY,
    label: 'PPR',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'operacao', label: 'Tipo de Operação' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor total' },
      { kind: 'trend', measureHint: 'valor', label: 'Evolução mensal' }
    ]
  },
  {
    id: 'net_worth',
    category: CATEGORY,
    label: 'Património',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'categoria', label: 'Categoria do Ativo' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor total' },
      { kind: 'trend', measureHint: 'valor', label: 'Evolução mensal' },
      { kind: 'breakdown', measureHint: 'valor', dimensionHint: 'categoria', label: 'Por categoria' }
    ]
  },
  {
    id: 'crypto_wallet',
    category: CATEGORY,
    label: 'Carteira Cripto',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'moeda', label: 'Moeda' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor total' },
      { kind: 'breakdown', measureHint: 'valor', dimensionHint: 'moeda', label: 'Por moeda' }
    ]
  },
  {
    id: 'precious_metals',
    category: CATEGORY,
    label: 'Ouro & Metais Preciosos',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'metal', label: 'Metal' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor total' }
    ]
  },
  {
    id: 'emergency_fund',
    category: CATEGORY,
    label: 'Fundo de Emergência',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor total' },
      { kind: 'trend', measureHint: 'valor', label: 'Evolução mensal' }
    ]
  },
  {
    id: 'savings_goal_home',
    category: CATEGORY,
    label: 'Poupança para Casa',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor acumulado' },
      { kind: 'trend', measureHint: 'valor', label: 'Evolução mensal' }
    ]
  },
  {
    id: 'savings_goal_wedding',
    category: CATEGORY,
    label: 'Poupança para Casamento',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor acumulado' }
    ]
  },
  {
    id: 'savings_goal_travel',
    category: CATEGORY,
    label: 'Poupança para Viagem',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor acumulado' }
    ]
  },
  {
    id: 'stocks_etfs',
    category: CATEGORY,
    label: 'Ações & ETFs',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'simbolo', label: 'Símbolo' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor total' },
      { kind: 'breakdown', measureHint: 'valor', dimensionHint: 'simbolo', label: 'Por ativo' }
    ]
  },
  {
    id: 'bonds',
    category: CATEGORY,
    label: 'Obrigações',
    suggestedMeasures: [
      { hint: 'valor', unit: 'EUR', label: 'Valor' }
    ],
    suggestedDimensions: [
      { hint: 'emitente', label: 'Emitente' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'valor', label: 'Valor total' }
    ]
  }
];
