import { CustomAccountPreset } from '@domain/models/custom-account-preset';

const CATEGORY = 'Veículos';

export const VEHICLE_PRESETS: readonly CustomAccountPreset[] = [
  {
    id: 'ev_charging',
    category: CATEGORY,
    label: 'Consumo do Carro Elétrico',
    suggestedMeasures: [
      { hint: 'kwh', unit: 'kWh', label: 'Energia' },
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'estacao', label: 'Estação de Carregamento' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'kwh', label: 'Total kWh este mês' },
      { kind: 'trend', measureHint: 'kwh', label: 'Consumo mensal' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'estacao', label: 'Custo por estação' }
    ]
  },
  {
    id: 'combustion_car',
    category: CATEGORY,
    label: 'Carro a Combustão',
    suggestedMeasures: [
      { hint: 'litros', unit: 'L', label: 'Litros' },
      { hint: 'consumo', unit: 'L_100KM', label: 'Consumo (l/100km)' },
      { hint: 'custo', unit: 'EUR', label: 'Custo' },
      { hint: 'km', unit: 'KM', label: 'Distância' }
    ],
    suggestedDimensions: [
      { hint: 'posto', label: 'Posto de Abastecimento' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'average', measureHint: 'consumo', label: 'Consumo médio' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'posto', label: 'Custo por posto' }
    ]
  },
  {
    id: 'hybrid_car',
    category: CATEGORY,
    label: 'Carro Híbrido',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' },
      { hint: 'km', unit: 'KM', label: 'Distância' }
    ],
    suggestedDimensions: [
      { hint: 'tipo', label: 'Combustível ou Carregamento' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'tipo', label: 'Custo por tipo' }
    ]
  },
  {
    id: 'motorbike',
    category: CATEGORY,
    label: 'Mota / Scooter',
    suggestedMeasures: [
      { hint: 'litros', unit: 'L', label: 'Litros' },
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'custo', label: 'Gasto mensal' }
    ]
  },
  {
    id: 'ebike',
    category: CATEGORY,
    label: 'Bicicleta Elétrica',
    suggestedMeasures: [
      { hint: 'kwh', unit: 'kWh', label: 'Energia' },
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [],
    suggestedViews: [
      { kind: 'total', measureHint: 'kwh', label: 'Total kWh este mês' }
    ]
  },
  {
    id: 'car_insurance',
    category: CATEGORY,
    label: 'Seguro Automóvel',
    suggestedMeasures: [
      { hint: 'premio', unit: 'EUR', label: 'Prémio' }
    ],
    suggestedDimensions: [
      { hint: 'seguradora', label: 'Seguradora' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'premio', label: 'Total pago este ano' },
      { kind: 'trend', measureHint: 'premio', label: 'Evolução do prémio' }
    ]
  },
  {
    id: 'car_maintenance',
    category: CATEGORY,
    label: 'Manutenção Automóvel',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' },
      { hint: 'km', unit: 'KM', label: 'Quilometragem' }
    ],
    suggestedDimensions: [
      { hint: 'oficina', label: 'Oficina' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este ano' },
      { kind: 'breakdown', measureHint: 'custo', dimensionHint: 'oficina', label: 'Custo por oficina' }
    ]
  },
  {
    id: 'parking_tolls',
    category: CATEGORY,
    label: 'Parqueamento & Portagens',
    suggestedMeasures: [
      { hint: 'custo', unit: 'EUR', label: 'Custo' }
    ],
    suggestedDimensions: [
      { hint: 'tipo', label: 'Parque ou Via' }
    ],
    suggestedViews: [
      { kind: 'total', measureHint: 'custo', label: 'Total gasto este mês' },
      { kind: 'trend', measureHint: 'custo', label: 'Gasto mensal' }
    ]
  }
];
