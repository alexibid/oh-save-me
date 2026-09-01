import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Subscrições & Digital';

export const SUBSCRIPTIONS_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'video_streaming',
    category: CATEGORY,
    label: 'Streaming Vídeo',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'servico', label: 'Serviço' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este mês' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'servico', label: 'Por serviço' }
    ]
  },
  {
    id: 'music_streaming',
    category: CATEGORY,
    label: 'Streaming Música',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'servico', label: 'Serviço' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este mês' }
    ]
  },
  {
    id: 'software_apps',
    category: CATEGORY,
    label: 'Software & Apps',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'app', label: 'Aplicação' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este mês' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'app', label: 'Por aplicação' }
    ]
  },
  {
    id: 'newspapers_magazines',
    category: CATEGORY,
    label: 'Jornais & Revistas',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este mês' }
    ]
  },
  {
    id: 'cloud_storage',
    category: CATEGORY,
    label: 'Cloud Storage',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'servico', label: 'Serviço' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este mês' }
    ]
  },
  {
    id: 'gaming_subscriptions',
    category: CATEGORY,
    label: 'Subscrições de Jogos',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'servico', label: 'Serviço' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total pago este mês' }
    ]
  }
];
