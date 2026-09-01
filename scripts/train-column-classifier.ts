import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  COLUMN_CLASSIFIER_CLASSES,
  ColumnClassifierClass,
  ColumnClassifierWeights,
  classIndexOf
} from '../src/app/domain/models/column-classifier-model';
import { extractColumnFeatures, COLUMN_FEATURE_NAMES } from '../src/app/domain/services/column-classifier-features';
import { trainStep, LEARNING_RATE } from '../src/app/domain/services/column-classifier-math';

const FEATURE_VERSION = 1;
const EPOCHS = 300;
const BOOTSTRAP_WEIGHT_DECAY = 0;

interface TrainingFixture {
  readonly headers: readonly string[];
  readonly sampleRows: readonly string[][];
  
  readonly labels: readonly ColumnClassifierClass[];
}

const FIXTURES: readonly TrainingFixture[] = [
  {
    headers: ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
    sampleRows: [
      ['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56'],
      ['22-07-2026', 'ORDENADO', '', '1200,00', '2434,56']
    ],
    labels: ['date', 'desc', 'debit', 'credit', 'balance']
  },
  {
    headers: ['Data mov.', 'Data valor', 'Descrição', 'Débito', 'Crédito', 'Saldo contabilístico', 'Saldo disponível', 'Categoria'],
    sampleRows: [
      ['23-07-2026', '23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56', '1200,00', 'COMPRAS'],
      ['22-07-2026', '23-07-2026', 'ORDENADO', '', '1200,00', '2434,56', '2400,00', 'SALARIO']
    ],
    labels: ['date', 'none', 'desc', 'debit', 'credit', 'balance', 'availableBalance', 'none']
  },
  {
    headers: ['Data', 'Movimento', 'Montante'],
    sampleRows: [
      ['23/07/2026', 'RESTAURANTE XPTO', '-25,30'],
      ['22/07/2026', 'FARMACIA CENTRAL', '-8,90']
    ],
    labels: ['date', 'desc', 'amount']
  },
  {
    headers: ['Data', 'Descricao', 'Debito', 'Credito'],
    sampleRows: [
      ['23-07-2026', 'PINGO DOCE', '12,00', ''],
      ['22-07-2026', 'CONTINENTE', '34,50', '']
    ],
    labels: ['date', 'desc', 'debit', 'credit']
  },
  {
    headers: ['Date', 'Description', 'Amount', 'Shares', 'Price', 'Fee', 'Tax', 'Symbol', 'Type', 'Name', 'Asset_class'],
    sampleRows: [
      ['2026-07-23', 'Buy trade', '-100.03', '1', '100.03', '1', '0', 'IE00B4L5Y983', 'BUY', 'Core MSCI World', 'FUND'],
      ['2026-07-20', 'Sell trade', '250.10', '2', '125.05', '1', '0', 'US0378331005', 'SELL', 'Apple Inc', 'STOCK']
    ],
    labels: ['date', 'desc', 'amount', 'shares', 'price', 'fee', 'tax', 'symbol', 'investmentType', 'assetName', 'assetType']
  },
  {
    headers: [
      'datetime', 'date', 'account_type', 'category', 'type', 'asset_class', 'name', 'symbol',
      'shares', 'price', 'amount', 'fee', 'tax', 'currency', 'original_amount', 'original_currency',
      'fx_rate', 'description', 'transaction_id', 'counterparty_name', 'counterparty_iban',
      'payment_reference', 'mcc_code'
    ],
    sampleRows: [
      [
        '2026-07-23T10:00:00', '2026-07-23', 'INVESTMENT', 'STOCKS', 'BUY', 'FUND', 'Core MSCI World',
        'IE00B4L5Y983', '1', '100.03', '-100.03', '1', '0', 'EUR', '-100.03', 'EUR', '1',
        'Buy trade', 'TXN12345', 'Trade Republic', 'DE1234567890', 'REF123', '6211'
      ]
    ],
    labels: [
      'none', 'date', 'none', 'none', 'investmentType', 'assetType', 'assetName', 'symbol',
      'shares', 'price', 'amount', 'fee', 'tax', 'none', 'none', 'none',
      'none', 'desc', 'none', 'none', 'none',
      'none', 'none'
    ]
  },
  {
    headers: ['Dia', 'Historico', 'Retirada', 'Deposito', 'Saldo Final'],
    sampleRows: [
      ['05/08/2026', 'SUPERMERCADO', '45,20', '', '890,30'],
      ['04/08/2026', 'SALARIO', '', '1500,00', '935,50']
    ],
    labels: ['date', 'desc', 'debit', 'credit', 'balance']
  },
  {
    headers: ['Timestamp', 'Narrative', 'Money Out', 'Money In', 'Running Total'],
    sampleRows: [
      ['2026-08-01T09:15:00', 'ATM WITHDRAWAL', '50.00', '', '1200.00'],
      ['2026-07-30T14:00:00', 'SALARY', '', '2000.00', '1250.00']
    ],
    labels: ['date', 'desc', 'debit', 'credit', 'balance']
  }
];

interface TrainingExample {
  readonly features: readonly number[];
  readonly classIndex: number;
}

function buildTrainingExamples(fixtures: readonly TrainingFixture[]): readonly TrainingExample[] {
  const examples: TrainingExample[] = [];

  fixtures.forEach(fixture => {
    fixture.headers.forEach((header, columnIndex) => {
      const columnValues = fixture.sampleRows.map(row => row[columnIndex] ?? '');
      const features = extractColumnFeatures(header, columnIndex, fixture.headers.length, columnValues);
      examples.push({ features, classIndex: classIndexOf(fixture.labels[columnIndex]) });
    });
  });

  return examples;
}

function zeroWeights(): ColumnClassifierWeights {
  return {
    matrix: COLUMN_CLASSIFIER_CLASSES.map(() => COLUMN_FEATURE_NAMES.map(() => 0)),
    featureVersion: FEATURE_VERSION,
    updatedAt: 0
  };
}

function trainWeights(): ColumnClassifierWeights {
  const examples = buildTrainingExamples(FIXTURES);
  let weights = zeroWeights();

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    examples.forEach(example => {
      weights = trainStep(weights, example.features, example.classIndex, LEARNING_RATE, BOOTSTRAP_WEIGHT_DECAY);
    });
  }

  return { ...weights, featureVersion: FEATURE_VERSION, updatedAt: 0 };
}

function renderConstant(weights: ColumnClassifierWeights): string {
  const rows = weights.matrix
    .map(row => `  [${row.map(value => roundForOutput(value)).join(', ')}]`)
    .join(',\n');

  return `import { ColumnClassifierWeights } from '../models/column-classifier-model';

export const BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS: ColumnClassifierWeights = {
  matrix: [
${rows}
  ],
  featureVersion: ${weights.featureVersion},
  updatedAt: 0
};
`;
}

function roundForOutput(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function main(): void {
  const weights = trainWeights();
  const output = renderConstant(weights);

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(scriptDir, '../src/app/domain/data/bootstrap-column-classifier-weights.ts');
  writeFileSync(outputPath, output);

  console.log(`Wrote bootstrap weights (${weights.matrix.length} classes x ${weights.matrix[0].length} features) to ${outputPath}`);
}

main();
