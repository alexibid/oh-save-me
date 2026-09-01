import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Dívidas & Crédito';

export const DEBT_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'credit_card_balance',
    category: CATEGORY,
    label: 'Cartão de Crédito (saldo devedor)',
    suggestedMeasures: [
      { hint: 'saldo', unit: 'EUR', label: 'Saldo Devedor' },
      { hint: 'juros', unit: 'EUR', label: 'Juros' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'saldo', label: 'Saldo devedor atual' },
      { kind: 'trend', measureHint: 'saldo', label: 'Evolução do saldo' }
    ]
  },
  {
    id: 'personal_loan',
    category: CATEGORY,
    label: 'Empréstimo Pessoal',
    suggestedMeasures: [
      { hint: 'prestacao', unit: 'EUR', label: 'Prestação' },
      { hint: 'saldo', unit: 'EUR', label: 'Saldo em Dívida' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'saldo', label: 'Saldo em dívida' },
      { kind: 'trend', measureHint: 'saldo', label: 'Evolução do saldo' }
    ]
  },
  {
    id: 'car_loan',
    category: CATEGORY,
    label: 'Empréstimo Automóvel',
    suggestedMeasures: [
      { hint: 'prestacao', unit: 'EUR', label: 'Prestação' },
      { hint: 'saldo', unit: 'EUR', label: 'Saldo em Dívida' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'saldo', label: 'Saldo em dívida' }
    ]
  },
  {
    id: 'payment_plan',
    category: CATEGORY,
    label: 'Plano de Pagamento',
    suggestedMeasures: [
      { hint: 'prestacao', unit: 'EUR', label: 'Prestação' },
      { hint: 'saldo', unit: 'EUR', label: 'Saldo Restante' }
    ],
    suggestedDimensions: [
      { hint: 'credor', label: 'Credor' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'saldo', label: 'Saldo restante' }
    ]
  }
];
