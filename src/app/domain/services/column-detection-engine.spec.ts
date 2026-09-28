import { detectColumnMapping, buildSignatureKey, suggestAccountFromSignature, suggestAccountCandidates } from './column-detection-engine';
import { MappingRule } from '@domain/models/mapping-rule';

describe('detectColumnMapping — known bank signatures', () => {
  it('detects CGD statement columns (debit/credit split, semicolon delimiter)', () => {
    const headers = ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'];
    const rows = [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.date).toEqual({ columnIndex: 0, confidence: 1 });
    expect(mapping.desc).toEqual({ columnIndex: 1, confidence: 1 });
    expect(mapping.debit).toEqual({ columnIndex: 2, confidence: 1 });
    expect(mapping.credit).toEqual({ columnIndex: 3, confidence: 1 });
    expect(mapping.balance).toEqual({ columnIndex: 4, confidence: 1 });
  });

  it('does not require an available-balance column for CGD to match (regression: older/shorter exports without "Saldo disponível" must still be recognized)', () => {
    const headers = ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'];
    const rows = [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.availableBalance).toBeUndefined();
    expect(mapping.balance).toEqual({ columnIndex: 4, confidence: 1 });
  });

  it('detects CGD\'s distinct "Saldo disponível" (available balance) separately from "Saldo contabilístico" (accounting balance)', () => {
    const headers = ['Data mov.', 'Data valor', 'Descrição', 'Débito', 'Crédito', 'Saldo contabilístico', 'Saldo disponível', 'Categoria'];
    const rows = [['23-07-2026', '23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56', '1200,00', 'COMPRAS']];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.balance).toEqual({ columnIndex: 5, confidence: 1 });
    expect(mapping.availableBalance).toEqual({ columnIndex: 6, confidence: 1 });
  });

  it('detects Cartão Universo statement columns (single signed amount)', () => {
    const headers = ['Data', 'Movimento', 'Montante'];
    const rows = [['23/07/2026', 'RESTAURANTE XPTO', '-25,30']];

    const mapping = detectColumnMapping(headers, rows, 'credit_card');

    expect(mapping.date).toEqual({ columnIndex: 0, confidence: 1 });
    expect(mapping.desc).toEqual({ columnIndex: 1, confidence: 1 });
    expect(mapping.amount).toEqual({ columnIndex: 2, confidence: 1 });
  });

  it('detects CGD "Consulta de Movimentos" statement columns (single signed amount, no debit/credit split)', () => {
    const headers = ['Data mov.', 'Data-valor', 'Descrição', 'Montante', 'Saldo contabilístico após movimento'];
    const rows = [['15-09-2026', '13-09-2026', 'COMPRAS C.DEB REPSOL', '-10,10', '1.887,75']];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.date).toEqual({ columnIndex: 0, confidence: 1 });
    expect(mapping.desc).toEqual({ columnIndex: 2, confidence: 1 });
    expect(mapping.amount).toEqual({ columnIndex: 3, confidence: 1 });
    expect(mapping.balance).toEqual({ columnIndex: 4, confidence: 1 });
  });

  it('is not confused into a Cartão Universo match by a balance column named "... após movimento" (regression: the word "movimento" inside the balance header must not be read as the description column)', () => {
    const headers = ['Data mov.', 'Data-valor', 'Descrição', 'Montante', 'Saldo contabilístico após movimento'];

    const suggestion = suggestAccountFromSignature(headers);

    expect(suggestion).toEqual({ name: 'CGD Consulta de Movimentos', type: 'bank_account' });
  });

  it('detects Cartão Refeição / Caixa Classic statement columns (debit/credit split)', () => {
    const headers = ['Data', 'Descricao', 'Debito', 'Credito'];
    const rows = [['23-07-2026', 'PINGO DOCE', '12,00', '']];

    const mapping = detectColumnMapping(headers, rows, 'meal_card');

    expect(mapping.date).toEqual({ columnIndex: 0, confidence: 1 });
    expect(mapping.desc).toEqual({ columnIndex: 1, confidence: 1 });
    expect(mapping.debit).toEqual({ columnIndex: 2, confidence: 1 });
    expect(mapping.credit).toEqual({ columnIndex: 3, confidence: 1 });
  });

  it('detects Trade Republic investment statement columns', () => {
    const headers = ['Date', 'Description', 'Amount', 'Shares', 'Price', 'Fee', 'Tax', 'Symbol', 'Type', 'Name', 'Asset_class'];
    const rows = [['2026-07-23', 'Buy trade', '-100.03', '1', '100.03', '1', '0', 'IE00B4L5Y983', 'BUY', 'Core MSCI World', 'FUND']];

    const mapping = detectColumnMapping(headers, rows, 'investment');

    expect(mapping.date).toEqual({ columnIndex: 0, confidence: 1 });
    expect(mapping.desc).toEqual({ columnIndex: 1, confidence: 1 });
    expect(mapping.amount).toEqual({ columnIndex: 2, confidence: 1 });
    expect(mapping.shares).toEqual({ columnIndex: 3, confidence: 1 });
    expect(mapping.price).toEqual({ columnIndex: 4, confidence: 1 });
    expect(mapping.fee).toEqual({ columnIndex: 5, confidence: 1 });
    expect(mapping.tax).toEqual({ columnIndex: 6, confidence: 1 });
    expect(mapping.symbol).toEqual({ columnIndex: 7, confidence: 1 });
    expect(mapping.investmentType).toEqual({ columnIndex: 8, confidence: 1 });
    expect(mapping.assetName).toEqual({ columnIndex: 9, confidence: 1 });
    expect(mapping.assetType).toEqual({ columnIndex: 10, confidence: 1 });
  });
});

describe('detectColumnMapping — unknown bank, heuristic fallback', () => {
  it('detects date/description/amount for a never-seen header set', () => {
    const headers = ['Data Valor', 'Descritivo', 'Valor Movimento'];
    const rows = [
      ['23/07/2026', 'FARMACIA CENTRAL', '-8,90'],
      ['22/07/2026', 'ORDENADO', '1200,00']
    ];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.date?.columnIndex).toBe(0);
    expect(mapping.desc?.columnIndex).toBe(1);
    expect(mapping.amount?.columnIndex).toBe(2);
  });

  it('prefers date over desc for a "Data Mov." column whose content is actually dates, despite "mov" also hinting at desc', () => {
    const headers = ['Data Mov', 'Detalhe'];
    const rows = [
      ['23-07-2026', 'LOJA X'],
      ['22-07-2026', 'LOJA Y']
    ];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.date?.columnIndex).toBe(0);
    expect(mapping.desc?.columnIndex).toBe(1);
  });

  it('gives a higher confidence to a column whose header AND content both match, than header alone', () => {
    const headers = ['Valor', 'Referencia'];
    const rows = [
      ['-8,90', 'ABC123'],
      ['1200,00', 'DEF456']
    ];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.amount?.columnIndex).toBe(0);
    expect(mapping.amount?.confidence).toBeGreaterThan(0.6);
  });

  it('leaves a field undetected when no column hints at it', () => {
    const headers = ['Descricao'];
    const rows = [['LOJA X']];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.date).toBeUndefined();
    expect(mapping.amount).toBeUndefined();
  });

  it('never assigns the same column to two different fields', () => {
    const headers = ['Data Mov'];
    const rows = [['23-07-2026']];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    const assignedColumns = Object.values(mapping)
      .filter((v): v is { columnIndex: number; confidence: number } => !!v)
      .map(v => v.columnIndex);
    expect(new Set(assignedColumns).size).toBe(assignedColumns.length);
  });
});

describe('detectColumnMapping — learned rules take priority', () => {
  it('uses a learned mapping for a matching signature instead of re-running detection', () => {
    const headers = ['Weird Col A', 'Weird Col B'];
    const rows = [['x', 'y']];
    const learnedRules: MappingRule[] = [{
      signatureKey: buildSignatureKey(headers),
      mapping: { date: { columnIndex: 1, confidence: 1 }, desc: { columnIndex: 0, confidence: 1 } },
      updatedAt: Date.now()
    }];

    const mapping = detectColumnMapping(headers, rows, 'bank_account', learnedRules);

    expect(mapping.date).toEqual({ columnIndex: 1, confidence: 1 });
    expect(mapping.desc).toEqual({ columnIndex: 0, confidence: 1 });
  });

  it('ignores a learned rule for a different signature', () => {
    const headers = ['Data', 'Movimento', 'Montante'];
    const rows = [['23/07/2026', 'RESTAURANTE XPTO', '-25,30']];
    const learnedRules: MappingRule[] = [{
      signatureKey: buildSignatureKey(['Some', 'Other', 'Headers']),
      mapping: { date: { columnIndex: 2, confidence: 1 } },
      updatedAt: Date.now()
    }];

    const mapping = detectColumnMapping(headers, rows, 'credit_card', learnedRules);

    expect(mapping.date).toEqual({ columnIndex: 0, confidence: 1 });
  });
});

describe('suggestAccountFromSignature', () => {
  it('suggests the account name and type for a recognized bank signature', () => {
    const headers = ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'];

    const suggestion = suggestAccountFromSignature(headers);

    expect(suggestion).toEqual({ name: 'CGD Extrato Normal', type: 'bank_account' });
  });

  it('suggests a different account for a different known bank signature', () => {
    const headers = ['Data', 'Movimento', 'Montante'];

    const suggestion = suggestAccountFromSignature(headers);

    expect(suggestion).toEqual({ name: 'Cartão Universo / Universo', type: 'credit_card' });
  });

  it('returns undefined for an unrecognized header set', () => {
    const headers = ['Coluna A', 'Coluna B'];

    expect(suggestAccountFromSignature(headers)).toBeUndefined();
  });

  it('abstains from a name suggestion when two templates tie on the exact same columns (regression: a real Caixa Classic export was misidentified as "Cartão Refeição" since both templates define identical date/desc/debit/credit columns)', () => {
    const headers = ['Data', 'Data valor', 'Descrição', 'Débito', 'Crédito', 'Fraccionar'];

    expect(suggestAccountFromSignature(headers)).toBeUndefined();

    const mapping = detectColumnMapping(headers, [], 'credit_card');
    expect(mapping.date).toBeDefined();
    expect(mapping.desc).toBeDefined();
    expect(mapping.debit).toBeDefined();
    expect(mapping.credit).toBeDefined();
  });

  it('is not confused by a superset match (regression: CGD\'s own 5-field signature also technically satisfies the generic 4-field Refeição/Caixa Classic templates, but CGD is strictly more specific and must win outright)', () => {
    const headers = ['Data mov.', 'Data valor', 'Descrição', 'Débito', 'Crédito', 'Saldo contabilístico', 'Saldo disponível', 'Categoria'];

    expect(suggestAccountFromSignature(headers)).toEqual({ name: 'CGD Extrato Normal', type: 'bank_account' });
  });

  it('prefers an exact column match over a substring one when suggesting from a real, noisier export (regression: Trade Republic\'s real "account_type"/"datetime" columns were stealing the "type"/"date" fields from the actual type/date columns)', () => {
    const headers = [
      'datetime', 'date', 'account_type', 'category', 'type', 'asset_class', 'name', 'symbol',
      'shares', 'price', 'amount', 'fee', 'tax', 'currency', 'original_amount', 'original_currency',
      'fx_rate', 'description', 'transaction_id', 'counterparty_name', 'counterparty_iban',
      'payment_reference', 'mcc_code'
    ];

    const suggestion = suggestAccountFromSignature(headers);
    expect(suggestion).toEqual({ name: 'Trade Republic Investimentos', type: 'investment' });

    const mapping = detectColumnMapping(headers, [], 'investment');
    expect(mapping.investmentType?.columnIndex).toBe(4);
    expect(mapping.desc?.columnIndex).toBe(17);
  });
});

describe('suggestAccountCandidates', () => {
  it('returns both tied candidates when two templates share the exact same columns (Cartão Refeição vs Caixa Classic)', () => {
    const headers = ['Data', 'Data valor', 'Descrição', 'Débito', 'Crédito', 'Fraccionar'];

    const candidates = suggestAccountCandidates(headers);

    expect(candidates).toHaveLength(2);
    expect(candidates).toEqual(expect.arrayContaining([
      { name: 'Cartão Refeição Padrão', type: 'meal_card' },
      { name: 'Caixa Classic', type: 'credit_card' }
    ]));
  });

  it('returns a single candidate when there is no ambiguity, matching suggestAccountFromSignature', () => {
    const headers = ['Data', 'Movimento', 'Montante'];

    expect(suggestAccountCandidates(headers)).toEqual([{ name: 'Cartão Universo / Universo', type: 'credit_card' }]);
  });

  it('returns an empty array for an unrecognized header set', () => {
    expect(suggestAccountCandidates(['Coluna A', 'Coluna B'])).toEqual([]);
  });
});

describe('detectColumnMapping — layer 3, trainable classifier', () => {
  it('resolves a genuinely unseen format via content-shape + position, where the old fixed-coefficient heuristic fails outright (no header keyword hits "dt", "benef", "saida" or "entrada")', () => {
    const headers = ['dt', 'benef', 'saida', 'entrada', 'saldo atual'];
    const rows = [
      ['23-07-2026', 'PADARIA CENTRAL', '4,50', '', '980,20'],
      ['22-07-2026', 'ORDENADO', '', '1500,00', '2480,20'],
      ['21-07-2026', 'FARMACIA', '9,80', '', '2470,40']
    ];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.date?.columnIndex).toBe(0);
    expect(mapping.desc?.columnIndex).toBe(1);
    expect(mapping.debit?.columnIndex).toBe(2);
    expect(mapping.credit?.columnIndex).toBe(3);
    expect(mapping.balance?.columnIndex).toBe(4);
  });

  it('leaves a running-index/reference column unassigned rather than force-mapping it to a real field', () => {
    const headers = ['dt', 'benef', 'saida', 'entrada', 'saldo atual', 'ref'];
    const rows = [
      ['23-07-2026', 'PADARIA CENTRAL', '4,50', '', '980,20', '1001'],
      ['22-07-2026', 'ORDENADO', '', '1500,00', '2480,20', '1002'],
      ['21-07-2026', 'FARMACIA', '9,80', '', '2470,40', '1003']
    ];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    const assignedColumns = Object.values(mapping)
      .filter((v): v is { columnIndex: number; confidence: number } => !!v)
      .map(v => v.columnIndex);
    expect(assignedColumns).not.toContain(5);
  });

  it('still lets the legacy heuristic win when it is more confident than the classifier alone (header AND content both match exactly)', () => {
    const headers = ['Valor', 'Referencia'];
    const rows = [
      ['-8,90', 'ABC123'],
      ['1200,00', 'DEF456']
    ];

    const mapping = detectColumnMapping(headers, rows, 'bank_account');

    expect(mapping.amount).toEqual({ columnIndex: 0, confidence: 1 });
  });
});
