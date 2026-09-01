import { Injectable, inject } from '@angular/core';
import { InvestmentType, Transaction } from '@domain/models/transaction';
import { CategoryMlService } from '@application/services/category-ml.service';
import { categorizeInvestmentTransaction } from '@domain/services/investment-category';
import { parseDate, normalizeAmount } from '@ibid/utils';
import { splitCsvLine, isSummaryRow, isRefundDescription, INVESTMENT_TYPE_MAP } from '@domain/shared/csv-split.utils';
import * as XLSX from 'xlsx';

export interface ColumnMapping {
  dateIdx: number;
  descIdx: number;
  amountIdx: number;
  debitIdx?: number;
  creditIdx?: number;
  balanceIdx?: number;
  sharesIdx?: number;
  priceIdx?: number;
  feeIdx?: number;
  taxIdx?: number;
  symbolIdx?: number;
  typeIdx?: number;
  assetNameIdx?: number;
  assetTypeIdx?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CsvParserService {
  private readonly mlService = inject(CategoryMlService);

  public getRawCsvLines(content: string, maxRows = 6): { delimiter: string; headerIdx: number; rows: string[][] } {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return { delimiter: ';', headerIdx: 0, rows: [] };
    let headerIdx = 0;
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      const hasDate = lower.includes('data') || lower.includes('date');
      const hasDesc = lower.includes('desc') || lower.includes('movimento') || lower.includes('payee');
      const hasAmount = lower.includes('val') || lower.includes('montante') || lower.includes('deb') || lower.includes('amount') || lower.includes('quant');

      if (hasDate && (hasDesc || hasAmount)) {
        headerIdx = i;
        break;
      }
    }

    const sampleLine = lines[headerIdx];
    const delimiter = sampleLine.includes(';') ? ';' : ',';
    const resultRows = lines.slice(headerIdx, headerIdx + maxRows).map(line =>
      splitCsvLine(line, delimiter)
    );

    return { delimiter, headerIdx, rows: resultRows };
  }

  public getRawExcelRows(arrayBuffer: ArrayBuffer, maxRows = 6): { headerIdx: number; rows: string[][] } {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

      if (rows.length === 0) return { headerIdx: 0, rows: [] };

      let headerIdx = 0;
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const row = rows[i] || [];
        const rowStr = row.map(cell => String(cell).toLowerCase()).join(' ');
        const hasDate = rowStr.includes('data') || rowStr.includes('date');
        const hasDesc = rowStr.includes('movimento') || rowStr.includes('desc') || rowStr.includes('payee');
        const hasAmount = rowStr.includes('montante') || rowStr.includes('amount') || rowStr.includes('valor') || rowStr.includes('deb');

        if (hasDate && (hasDesc || hasAmount)) {
          headerIdx = i;
          break;
        }
      }

      const resultRows = rows.slice(headerIdx, headerIdx + maxRows).map(row =>
        (row || []).map(cell => cell === null || cell === undefined ? '' : String(cell).trim())
      );

      return { headerIdx, rows: resultRows };
    } catch (err) {
      console.error('[CsvParserService] Failed to read raw Excel rows:', err);
      return { headerIdx: 0, rows: [] };
    }
  }

  public async parseCsvWithMapping(content: string, mapping: ColumnMapping, delimiter: string, headerRowIndex = 0, accountId = 'default_account'): Promise<Transaction[]> {
    await this.mlService.loadRules();
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length <= headerRowIndex + 1) return [];

    const transactions: Transaction[] = [];
    const dateIdx = mapping.dateIdx;
    const descIdx = mapping.descIdx;
    const amountIdx = mapping.amountIdx;
    const debitIdx = mapping.debitIdx;
    const creditIdx = mapping.creditIdx;
    const occurrenceCounts = new Map<string, number>();

    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const row = splitCsvLine(lines[i], delimiter);
      if (row.length < Math.max(dateIdx, descIdx, amountIdx, creditIdx ?? 0, debitIdx ?? 0) + 1) continue;

      const rawDate = row[dateIdx];
      const description = row[descIdx] || 'Unnamed Transaction';

      const date = rawDate ? parseDate(rawDate) : null;
      if (!date || this.isSummaryDescription(description)) continue;

      let amount = 0;
      if ((debitIdx !== undefined && debitIdx >= 0) || (creditIdx !== undefined && creditIdx >= 0)) {
        const rawDebit = debitIdx !== undefined && debitIdx >= 0 ? (row[debitIdx] || '') : '';
        const rawCredit = creditIdx !== undefined && creditIdx >= 0 ? (row[creditIdx] || '') : '';
        if (rawCredit && rawCredit !== '0') {
          amount = normalizeAmount(rawCredit);
        } else if (rawDebit && rawDebit !== '0') {
          amount = -Math.abs(normalizeAmount(rawDebit));
        }
      } else if (amountIdx >= 0) {
        amount = normalizeAmount(row[amountIdx]);
      }

      let balance: number | undefined = undefined;
      if (mapping.balanceIdx !== undefined && mapping.balanceIdx >= 0) {
        const rawBalance = row[mapping.balanceIdx];
        if (rawBalance) {
          balance = normalizeAmount(rawBalance);
        }
      }

      let shares: number | undefined = undefined;
      if (mapping.sharesIdx !== undefined && mapping.sharesIdx >= 0) {
        const val = row[mapping.sharesIdx];
        if (val) shares = normalizeAmount(val);
      }

      let price: number | undefined = undefined;
      if (mapping.priceIdx !== undefined && mapping.priceIdx >= 0) {
        const val = row[mapping.priceIdx];
        if (val) price = normalizeAmount(val);
      }

      let fee: number | undefined = undefined;
      if (mapping.feeIdx !== undefined && mapping.feeIdx >= 0) {
        const val = row[mapping.feeIdx];
        if (val) fee = normalizeAmount(val);
      }

      let tax: number | undefined = undefined;
      if (mapping.taxIdx !== undefined && mapping.taxIdx >= 0) {
        const val = row[mapping.taxIdx];
        if (val) tax = normalizeAmount(val);
      }

      let symbol: string | undefined = undefined;
      if (mapping.symbolIdx !== undefined && mapping.symbolIdx >= 0) {
        symbol = row[mapping.symbolIdx];
      }

      let investmentType: InvestmentType | undefined = undefined;
      if (mapping.typeIdx !== undefined && mapping.typeIdx >= 0) {
        const rawType = (row[mapping.typeIdx] || '').trim().toUpperCase();
        investmentType = INVESTMENT_TYPE_MAP[rawType] ?? 'other';
      }

      let assetName: string | undefined = undefined;
      if (mapping.assetNameIdx !== undefined && mapping.assetNameIdx >= 0) {
        const val = row[mapping.assetNameIdx];
        if (val) assetName = val;
      }

      let assetType: string | undefined = undefined;
      if (mapping.assetTypeIdx !== undefined && mapping.assetTypeIdx >= 0) {
        const val = row[mapping.assetTypeIdx];
        if (val) assetType = val;
      }
      if (shares !== undefined && investmentType === 'sell') {
        shares = Math.abs(shares);
      }

      const isRefund = this.detectIsRefund(description, amount);
      const category = categorizeInvestmentTransaction(investmentType) ?? this.mlService.predict(description, isRefund);

      const dedupKey = `${date}|${description}|${amount}`;
      const occurrence = occurrenceCounts.get(dedupKey) ?? 0;
      occurrenceCounts.set(dedupKey, occurrence + 1);
      const id = await this.generateHash(date, description, amount, accountId, occurrence);

      transactions.push({
        id, date, description, amount, category, balance, accountId, importBatchId: '',
        shares, price, fee, tax, symbol, investmentType, assetName, assetType
      });
    }

    return transactions;
  }

  public async parseExcelWithMapping(arrayBuffer: ArrayBuffer, mapping: ColumnMapping, headerRowIndex = 0, accountId = 'default_account'): Promise<Transaction[]> {
    await this.mlService.loadRules();
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

      if (rows.length <= headerRowIndex + 1) return [];

      const transactions: Transaction[] = [];
      const dateIdx = mapping.dateIdx;
      const descIdx = mapping.descIdx;
      const amountIdx = mapping.amountIdx;
      const debitIdx = mapping.debitIdx;
      const creditIdx = mapping.creditIdx;
      const occurrenceCounts = new Map<string, number>();

      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.length < Math.max(dateIdx, descIdx, amountIdx, creditIdx ?? 0, debitIdx ?? 0) + 1) continue;

        const rawDate = String(row[dateIdx] || '');
        const description = String(row[descIdx] || 'Unnamed Transaction');

        const date = rawDate ? parseDate(rawDate) : null;
        if (!date || this.isSummaryDescription(description)) continue;

        let amount = 0;
        if ((debitIdx !== undefined && debitIdx >= 0) || (creditIdx !== undefined && creditIdx >= 0)) {
          const rawDebit = debitIdx !== undefined && debitIdx >= 0 ? String(row[debitIdx] || '') : '';
          const rawCredit = creditIdx !== undefined && creditIdx >= 0 ? String(row[creditIdx] || '') : '';
          if (rawCredit && rawCredit !== '0' && rawCredit !== 'undefined') {
            amount = normalizeAmount(rawCredit);
          } else if (rawDebit && rawDebit !== '0' && rawDebit !== 'undefined') {
            amount = -Math.abs(normalizeAmount(rawDebit));
          }
        } else if (amountIdx >= 0) {
          amount = normalizeAmount(String(row[amountIdx] || '0'));
        }

        let balance: number | undefined = undefined;
        if (mapping.balanceIdx !== undefined && mapping.balanceIdx >= 0) {
          const rawBalance = String(row[mapping.balanceIdx] || '');
          if (rawBalance) {
            balance = normalizeAmount(rawBalance);
          }
        }

        let shares: number | undefined = undefined;
        if (mapping.sharesIdx !== undefined && mapping.sharesIdx >= 0) {
          const val = String(row[mapping.sharesIdx] || '');
          if (val) shares = normalizeAmount(val);
        }

        let price: number | undefined = undefined;
        if (mapping.priceIdx !== undefined && mapping.priceIdx >= 0) {
          const val = String(row[mapping.priceIdx] || '');
          if (val) price = normalizeAmount(val);
        }

        let fee: number | undefined = undefined;
        if (mapping.feeIdx !== undefined && mapping.feeIdx >= 0) {
          const val = String(row[mapping.feeIdx] || '');
          if (val) fee = normalizeAmount(val);
        }

        let tax: number | undefined = undefined;
        if (mapping.taxIdx !== undefined && mapping.taxIdx >= 0) {
          const val = String(row[mapping.taxIdx] || '');
          if (val) tax = normalizeAmount(val);
        }

        let symbol: string | undefined = undefined;
        if (mapping.symbolIdx !== undefined && mapping.symbolIdx >= 0) {
          symbol = String(row[mapping.symbolIdx] || '');
        }

        let investmentType: InvestmentType | undefined = undefined;
        if (mapping.typeIdx !== undefined && mapping.typeIdx >= 0) {
          const rawType = String(row[mapping.typeIdx] || '').trim().toUpperCase();
          investmentType = INVESTMENT_TYPE_MAP[rawType] ?? 'other';
        }

        let assetName: string | undefined = undefined;
        if (mapping.assetNameIdx !== undefined && mapping.assetNameIdx >= 0) {
          const val = String(row[mapping.assetNameIdx] || '');
          if (val) assetName = val;
        }

        let assetType: string | undefined = undefined;
        if (mapping.assetTypeIdx !== undefined && mapping.assetTypeIdx >= 0) {
          const val = String(row[mapping.assetTypeIdx] || '');
          if (val) assetType = val;
        }

        if (shares !== undefined && investmentType === 'sell') {
          shares = Math.abs(shares);
        }

        const isRefund = this.detectIsRefund(description, amount);
        const category = categorizeInvestmentTransaction(investmentType) ?? this.mlService.predict(description, isRefund);

        const dedupKey = `${date}|${description}|${amount}`;
        const occurrence = occurrenceCounts.get(dedupKey) ?? 0;
        occurrenceCounts.set(dedupKey, occurrence + 1);
        const id = await this.generateHash(date, description, amount, accountId, occurrence);

        transactions.push({
          id, date, description, amount, category, balance, accountId, importBatchId: '',
          shares, price, fee, tax, symbol, investmentType, assetName, assetType
        });
      }

      return transactions;
    } catch (err) {
      console.error('[CsvParserService] Failed to parse Excel with mapping:', err);
      return [];
    }
  }

  public async parse(content: string): Promise<Transaction[]> {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    let isCgd = false;
    let isUniverso = false;

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('data mov.') && lower.includes('descrição') && lower.includes('débito')) {
        isCgd = true;
        break;
      }
      if (lower.includes('data') && lower.includes('movimento') && (lower.includes('montante') || lower.includes('valor'))) {
        isUniverso = true;
        break;
      }
    }

    if (isCgd) {
      return this.parseCgd(lines);
    } else if (isUniverso) {
      return this.parseUniverso(lines);
    } else {
      return this.parseGeneral(lines);
    }
  }

  public async parseExcel(arrayBuffer: ArrayBuffer): Promise<Transaction[]> {
    try {
      const { headerIdx, rows } = this.getRawExcelRows(arrayBuffer, 1);
      if (rows.length === 0) return [];

      const headers = rows[0].map(h => String(h).trim().toLowerCase());
      const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
      const descIdx = headers.findIndex(h => h.includes('movimento') || h.includes('desc'));
      const amountIdx = headers.findIndex(h => h.includes('montante') || h.includes('amount') || h.includes('valor'));

      return await this.parseExcelWithMapping(arrayBuffer, { dateIdx, descIdx, amountIdx }, headerIdx);
    } catch (err) {
      console.error('[CsvParserService] Failed to parse Excel file:', err);
      return [];
    }
  }

  private async parseCgd(lines: string[]): Promise<Transaction[]> {
    const { delimiter, headerIdx, rows } = this.getRawCsvLines(lines.join('\n'), 1);
    if (rows.length === 0) return [];

    const columns = rows[0].map(c => c.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const dateIdx = columns.findIndex(col => col.includes('data mov'));
    const descIdx = columns.findIndex(col => col.includes('descri'));
    const debitIdx = columns.findIndex(col => col.includes('debi'));
    const creditIdx = columns.findIndex(col => col.includes('credi'));

    return this.parseCsvWithMapping(lines.join('\n'), { dateIdx, descIdx, amountIdx: -1, debitIdx, creditIdx }, delimiter, headerIdx);
  }

  private async parseUniverso(lines: string[]): Promise<Transaction[]> {
    const { delimiter, headerIdx, rows } = this.getRawCsvLines(lines.join('\n'), 1);
    if (rows.length === 0) return [];

    const columns = rows[0].map(c => c.trim().toLowerCase());
    const dateIdx = columns.findIndex(col => col.includes('data') || col.includes('date'));
    const descIdx = columns.findIndex(col => col.includes('movimento') || col.includes('desc'));
    const amountIdx = columns.findIndex(col => col.includes('montante') || col.includes('amount') || col.includes('valor'));

    return this.parseCsvWithMapping(lines.join('\n'), { dateIdx, descIdx, amountIdx }, delimiter, headerIdx);
  }

  private async parseGeneral(lines: string[]): Promise<Transaction[]> {
    const { delimiter, headerIdx, rows } = this.getRawCsvLines(lines.join('\n'), 1);
    if (rows.length === 0) return [];

    const columns = rows[0].map(c => c.trim().toLowerCase());
    const dateIdx = columns.findIndex(col => col.includes('dat') || col.includes('date'));
    const descIdx = columns.findIndex(col => col.includes('desc') || col.includes('payee') || col.includes('deta'));
    const amountIdx = columns.findIndex(col => col.includes('val') || col.includes('amo') || col.includes('quant'));

    return this.parseCsvWithMapping(lines.join('\n'), { dateIdx, descIdx, amountIdx }, delimiter, headerIdx);
  }

  public saveFileToUploads(fileName: string, content: string | ArrayBuffer): boolean {
    return true;
  }

  public decodeText(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const hasBom = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const contentBytes = hasBom ? bytes.subarray(3) : bytes;

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(contentBytes);
    } catch {
      return new TextDecoder('windows-1252').decode(contentBytes);
    }
  }

  public async calculateChecksum(content: string | ArrayBuffer): Promise<string> {
    if (content instanceof ArrayBuffer) {
      return 'buf_' + await this.sha256Hex(content);
    }
    return 'str_' + await this.sha256Hex(content || '');
  }

  private async sha256Hex(input: string | ArrayBuffer): Promise<string> {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private detectIsRefund(description: string, amount: number): boolean {
    if (amount <= 0) return false;
    return isRefundDescription(description);
  }

  private isSummaryDescription(description: string): boolean {
    return isSummaryRow(description);
  }

  public async generateHash(
    date: string,
    description: string,
    amount: number,
    accountId = 'default_account',
    occurrence = 0
  ): Promise<string> {
    const str = `${date}|${description}|${amount}|${accountId}|${occurrence}`;
    return 'tx_' + await this.sha256Hex(str);
  }
}
