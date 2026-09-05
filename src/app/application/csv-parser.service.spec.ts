import { TestBed } from '@angular/core/testing';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { CsvParserService } from './csv-parser.service';
import { CategoryMlService } from '@application/services/category-ml.service';
import { createMockCategoryMlService } from '@/mocks/services.mock';
import { CategoryType } from '@domain/models/category';

const statementsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../mocks/statements',
);

const statementFixture = (name: string) =>
  fs.readFileSync(path.join(statementsDir, name), 'utf-8');

describe('CsvParserService', () => {
  let service: CsvParserService;

  interface MlMock {
    predict: (desc: string, isRefund?: boolean) => CategoryType;
    learn: (desc: string, category: CategoryType) => void;
    loadRules: () => Promise<void>;
  }

  const mlMock: MlMock = createMockCategoryMlService({
    predict: (_desc: string, _isRefund?: boolean): CategoryType => 'Others',
    learn: (_desc: string, _category: CategoryType) => {}
  }) as unknown as MlMock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CsvParserService,
        { provide: CategoryMlService, useValue: mlMock }
      ]
    });

    service = TestBed.inject(CsvParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse CGD format statement and auto-detect categories using mocked ML', async () => {
    let predictCallCount = 0;
    mlMock.predict = (desc: string, _isRefund?: boolean): CategoryType => {
      predictCallCount++;
      const lower = desc.toLowerCase();
      if (lower.includes('mango')) return 'Clothing';
      if (lower.includes('contine')) return 'Groceries';
      if (lower.includes('via verde')) return 'Transportation';
      return 'Others';
    };

    const cgdCsv = `Consultar saldos e movimentos à ordem - 22-07-2026
Conta ;0574003591800 - EUR - Conta à ordem
Data de início ;27-06-2025
Data de fim ;22-07-2026

Data mov. ;Data valor ;Descrição ;Débito ;Crédito ;Saldo contabilístico ;Saldo disponível ;Categoria ;
22-07-2026;21-07-2026;VIA VERDE ;2,80;;2.897,47;2.879,79;Diversos ;
22-07-2026;20-07-2026;COMPRAS C.DEB CONTINE ;71,45;;2.989,84;2.946,48;Diversos ;
21-07-2026;21-07-2026;DEVOL MANGO ;;63,97;3.098,77;2.943,49;DEPOSITO ;`;

    const transactions = await service.parse(cgdCsv);

    expect(transactions.length).toBe(3);
    expect(predictCallCount).toBe(3);

    expect(transactions[0].description).toBe('VIA VERDE');
    expect(transactions[0].amount).toBe(-2.80);
    expect(transactions[0].category).toBe('Transportation');

    expect(transactions[1].description).toBe('COMPRAS C.DEB CONTINE');
    expect(transactions[1].amount).toBe(-71.45);
    expect(transactions[1].category).toBe('Groceries');

    expect(transactions[2].description).toBe('DEVOL MANGO');
    expect(transactions[2].amount).toBe(63.97);
    expect(transactions[2].category).toBe('Clothing');
  });

  it('should parse Universo format statement using mocked ML', async () => {
    mlMock.predict = (desc: string, _isRefund?: boolean): CategoryType => {
      const lower = desc.toLowerCase();
      if (lower.includes('steam')) return 'Entertainment';
      if (lower.includes('coursera')) return 'Education';
      return 'Others';
    };

    const universoCsv = `Data;Movimento;Cartão;Modalidade;Montante;Descontos;Categoria
11-07-2026;Steam Purchase;ALEXANDRE SANTOS;Fim do Mês;-8,99;0,00;Entretenimento
08-07-2026;COURSERA.ORG;ALEXANDRE SANTOS;Fim do Mês;-41,00;0,00;Educação`;

    const transactions = await service.parse(universoCsv);

    expect(transactions.length).toBe(2);

    expect(transactions[0].description).toBe('Steam Purchase');
    expect(transactions[0].amount).toBe(-8.99);
    expect(transactions[0].category).toBe('Entertainment');

    expect(transactions[1].description).toBe('COURSERA.ORG');
    expect(transactions[1].amount).toBe(-41.00);
    expect(transactions[1].category).toBe('Education');
  });

  it('should return empty list on malformed or empty inputs (negative path)', async () => {
    expect(await service.parse('')).toEqual([]);
    expect(await service.parse('Random non-csv text header\nline 2 values')).toEqual([]);
  });

  it('should correctly extract raw lines and delimiter from CSV', () => {
    const rawCsv = `My Bank Statement Header Info
Date;Description;Amount;Extra
2026-07-22;Salary;2500;Test
2026-07-22;Market;-54.30;Test`;

    const { delimiter, headerIdx, rows } = service.getRawCsvLines(rawCsv, 3);

    expect(delimiter).toBe(';');
    expect(headerIdx).toBe(1);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(['Date', 'Description', 'Amount', 'Extra']);
    expect(rows[1]).toEqual(['2026-07-22', 'Salary', '2500', 'Test']);
  });

  it('should parse CSV using custom column mappings (TDD)', async () => {
    const customCsv = `Date,Desc,Debit,Credit
2026-07-22,Salary,0,2500
2026-07-22,Restaurant,35.50,0`;

    const mapping = {
      dateIdx: 0,
      descIdx: 1,
      amountIdx: -1,
      debitIdx: 2,
      creditIdx: 3
    };

    const transactions = await service.parseCsvWithMapping(customCsv, mapping, ',', 0);

    expect(transactions.length).toBe(2);
    expect(transactions[0].description).toBe('Salary');
    expect(transactions[0].amount).toBe(2500);
    expect(transactions[1].description).toBe('Restaurant');
    expect(transactions[1].amount).toBe(-35.50);
  });

  it('should parse a single signed "amount" column with no separate debit/credit columns', async () => {
    const signedCsv = `Date,Desc,Amount
2026-07-22,Salary,2500
2026-07-22,Restaurant,-35.50`;

    const mapping = { dateIdx: 0, descIdx: 1, amountIdx: 2 };
    const transactions = await service.parseCsvWithMapping(signedCsv, mapping, ',', 0);

    expect(transactions.length).toBe(2);
    expect(transactions[0].amount).toBe(2500);
    expect(transactions[1].amount).toBe(-35.50);
  });

  it('should support a debit-only column with no credit column at all', async () => {
    const debitOnlyCsv = `Date,Desc,Debit
2026-07-22,Coffee,3.50`;

    const mapping = { dateIdx: 0, descIdx: 1, amountIdx: -1, debitIdx: 2 };
    const transactions = await service.parseCsvWithMapping(debitOnlyCsv, mapping, ',', 0);

    expect(transactions.length).toBe(1);
    expect(transactions[0].amount).toBe(-3.50);
  });

  it('should not drop rows for any real-world date format (regression: YYYY/MM/DD was silently skipped)', async () => {
    const mixedFormatCsv = `Date,Desc,Debit,Credit
2023/01/02,Year-first slash,10,0
02-01-2023,Day-first dash,20,0
02/01/2023,Day-first slash,30,0
2023-01-02,Year-first dash,40,0
2023.01.02,Year-first dot,50,0
02.01.2023,Day-first dot,60,0`;

    const mapping = { dateIdx: 0, descIdx: 1, amountIdx: -1, debitIdx: 2, creditIdx: 3 };
    const transactions = await service.parseCsvWithMapping(mixedFormatCsv, mapping, ',', 0);

    expect(transactions.length).toBe(6);
    expect(transactions.every(t => t.date === '2023-01-02')).toBe(true);
  });

  it('should give distinct ids to two real transactions sharing date+description+amount (regression: they used to collapse into one)', async () => {
    const duplicateLookingCsv = `Date,Desc,Debit,Credit
01-07-2026,Coffee,3,0
01-07-2026,Coffee,3,0
01-07-2026,Coffee,3,0`;

    const mapping = { dateIdx: 0, descIdx: 1, amountIdx: -1, debitIdx: 2, creditIdx: 3 };
    const transactions = await service.parseCsvWithMapping(duplicateLookingCsv, mapping, ',', 0);

    expect(transactions.length).toBe(3);
    const ids = new Set(transactions.map(t => t.id));
    expect(ids.size).toBe(3);
  });

  it('should still assign the same ids when the same file is parsed again (so cross-import dedup keeps working)', async () => {
    const csv = `Date,Desc,Debit,Credit
01-07-2026,Coffee,3,0
01-07-2026,Coffee,3,0
02-07-2026,Lunch,12,0`;

    const mapping = { dateIdx: 0, descIdx: 1, amountIdx: -1, debitIdx: 2, creditIdx: 3 };
    const firstPass = await service.parseCsvWithMapping(csv, mapping, ',', 0);
    const secondPass = await service.parseCsvWithMapping(csv, mapping, ',', 0);

    expect(secondPass.map(t => t.id)).toEqual(firstPass.map(t => t.id));
  });

  it('should generate a cryptographic (SHA-256) hash id, stable across calls and unique per transaction', async () => {
    const id1 = await service.generateHash('2026-07-22', 'Salary', 2500, 'acc_1');
    const id2 = await service.generateHash('2026-07-22', 'Salary', 2500, 'acc_1');
    const id3 = await service.generateHash('2026-07-22', 'Restaurant', -35.50, 'acc_1');

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1.startsWith('tx_')).toBe(true);
    expect(id1.replace('tx_', '')).toHaveLength(64);
  });

  it('should produce matching checksums for identical file content and different ones for different content', async () => {
    const checksumA = await service.calculateChecksum('a,b,c\n1,2,3');
    const checksumB = await service.calculateChecksum('a,b,c\n1,2,3');
    const checksumC = await service.calculateChecksum('a,b,c\n4,5,6');

    expect(checksumA).toBe(checksumB);
    expect(checksumA).not.toBe(checksumC);
  });

  describe('investment transaction categorization (investmentType takes priority over text-based prediction)', () => {
    beforeEach(() => {

      mlMock.predict = (): CategoryType => 'Others';
    });

    it('categorizes BUY/SELL/DIVIDEND rows deterministically, ignoring the (gibberish, fund-ISIN) description entirely', async () => {
      const csv = `Date,Desc,Amount,Type
2026-07-22,Buy trade IE00B4L5Y983 iShares Core MSCI World,-100.03,BUY
2026-07-20,Sell trade IE00B4L5Y983 iShares Core MSCI World,250.10,SELL
2026-07-15,Dividend payment,5.20,DIVIDEND`;

      const mapping = { dateIdx: 0, descIdx: 1, amountIdx: 2, typeIdx: 3 };
      const transactions = await service.parseCsvWithMapping(csv, mapping, ',', 0);

      expect(transactions[0].category).toBe('Investments');
      expect(transactions[1].category).toBe('AssetSale');
      expect(transactions[2].category).toBe('Dividends');
    });

    it('categorizes interest and transfer-shaped raw types deterministically too, not just BUY/SELL/DIVIDEND', async () => {
      const csv = `Date,Desc,Amount,Type
2026-07-22,Interest payment,0.85,INTEREST_PAYMENT
2026-07-20,Withdrawal to bank,-500.00,TRANSFER_OUTBOUND`;

      const mapping = { dateIdx: 0, descIdx: 1, amountIdx: 2, typeIdx: 3 };
      const transactions = await service.parseCsvWithMapping(csv, mapping, ',', 0);

      expect(transactions[0].category).toBe('Interest');
      expect(transactions[1].category).toBe('Transfers');
    });

    it("falls back to text-based prediction when the raw type string doesn't map to anything known ('other')", async () => {
      mlMock.predict = (): CategoryType => 'Investments';

      const csv = `Date,Desc,Amount,Type
2026-07-22,Some unusual operation,1.00,SOMETHING_WEIRD`;

      const mapping = { dateIdx: 0, descIdx: 1, amountIdx: 2, typeIdx: 3 };
      const transactions = await service.parseCsvWithMapping(csv, mapping, ',', 0);

      expect(transactions[0].category).toBe('Investments');
    });

    it('leaves ordinary (non-investment) imports fully unaffected — no typeIdx at all still goes straight through prediction', async () => {
      mlMock.predict = (): CategoryType => 'Groceries';

      const csv = `Date,Desc,Amount
2026-07-22,Continente,-45.30`;

      const mapping = { dateIdx: 0, descIdx: 1, amountIdx: 2 };
      const transactions = await service.parseCsvWithMapping(csv, mapping, ',', 0);

      expect(transactions[0].category).toBe('Groceries');
      expect(transactions[0].investmentType).toBeUndefined();
    });
  });

  describe('decodeText', () => {
    it('should decode UTF-8 without a BOM correctly (regression: hardcoded ISO-8859-1 corrupted these)', () => {
      const buffer = new TextEncoder().encode('Data;Descrição;Débito;Crédito').buffer;
      expect(service.decodeText(buffer)).toBe('Data;Descrição;Débito;Crédito');
    });

    it('should strip a UTF-8 BOM and decode the rest as UTF-8', () => {
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const body = new TextEncoder().encode('Data;Descrição');
      const combined = new Uint8Array(bom.length + body.length);
      combined.set(bom, 0);
      combined.set(body, bom.length);

      expect(service.decodeText(combined.buffer)).toBe('Data;Descrição');
    });

    it('should fall back to windows-1252 for non-UTF-8 bytes', () => {
      const bytes = new Uint8Array([0x44, 0xE9, 0x62, 0x69, 0x74, 0x6F]);
      expect(service.decodeText(bytes.buffer)).toBe('Débito');
    });
  });

  describe('Parsing statement fixtures', () => {
    it('parses a CGD statement, signing debits negative and credits positive', async () => {
      const transactions = await service.parse(statementFixture('cgd.csv'));

      expect(transactions.length).toBe(8);

      const salary = transactions.find(t => t.description.includes('SALARIO'));
      expect(salary?.amount).toBe(2500);

      const groceries = transactions.find(t => t.description.includes('SUPERMERCADO'));
      expect(groceries?.amount).toBe(-145.2);

      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      expect(Math.round(total * 100) / 100).toBe(2226.06);
    });

    it('parses a Trade Republic export through an explicit column mapping', async () => {
      const content = statementFixture('trade-republic.csv');
      const mapping = {
        dateIdx: 1,
        descIdx: 17,
        amountIdx: 10,
        sharesIdx: 8,
        priceIdx: 9,
        feeIdx: 11,
        taxIdx: 12,
        symbolIdx: 7,
        typeIdx: 4,
        assetNameIdx: 6,
        assetTypeIdx: 5
      };
      const transactions = await service.parseCsvWithMapping(content, mapping, ',', 0);

      expect(transactions.length).toBe(6);

      const buy = transactions.find(t => t.symbol === 'IWDA' && t.amount < 0);
      expect(buy?.shares).toBe(2.5);
      expect(buy?.price).toBe(98.4);
      expect(buy?.amount).toBe(-246);

      const dividend = transactions.find(t => t.description.includes('Dividendos'));
      expect(dividend?.amount).toBe(15.2);
    });
  });
});
