import { Injectable, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { CsvParserService } from '@application/csv-parser.service';
import { CustomRecord, CustomRecordMeasure } from '@domain/models/custom-record';
import { ColumnRole } from '@domain/models/column-role';

export interface ImportCustomRecordsInput {
  readonly accountId: string;
  readonly headers: readonly string[];
  readonly rows: readonly string[][];
  readonly columnRoles: readonly ColumnRole[];
  readonly measureUnits: Readonly<Record<number, string>>;
  readonly importBatchId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImportCustomRecordsUseCase {
  private readonly store = useStore();
  private readonly csvParser = inject(CsvParserService);

  async execute(input: ImportCustomRecordsInput): Promise<readonly CustomRecord[]> {
    const dateIdx = input.columnRoles.indexOf('date');
    const occurrenceByKey = new Map<string, number>();

    const records = await Promise.all(input.rows.map(async row => {
      const date = dateIdx >= 0 ? (row[dateIdx] ?? '') : '';
      const { dimensions, measures } = this.buildDimensionsAndMeasures(input, row);

      const contentKey = `${date}|${JSON.stringify(dimensions)}|${JSON.stringify(measures)}`;
      const occurrence = occurrenceByKey.get(contentKey) ?? 0;
      occurrenceByKey.set(contentKey, occurrence + 1);

      const id = await this.csvParser.generateHash(date, contentKey, 0, input.accountId, occurrence);

      const record: CustomRecord = {
        id,
        accountId: input.accountId,
        date,
        dimensions,
        measures,
        importBatchId: input.importBatchId,
        updatedAt: Date.now()
      };
      return record;
    }));

    await this.store.addCustomRecords(records);
    return records;
  }

  private buildDimensionsAndMeasures(
    input: ImportCustomRecordsInput,
    row: readonly string[]
  ): { dimensions: Record<string, string>; measures: Record<string, CustomRecordMeasure> } {
    const dimensions: Record<string, string> = {};
    const measures: Record<string, CustomRecordMeasure> = {};

    input.columnRoles.forEach((role, colIdx) => {
      const header = input.headers[colIdx] ?? `col_${colIdx}`;
      const raw = (row[colIdx] ?? '').trim();
      if (!raw) return;

      if (role === 'dimension') {
        dimensions[header] = raw;
      } else if (role === 'measure') {
        const value = parseFloat(raw.replace(',', '.'));
        if (!isNaN(value)) {
          measures[header] = { value, unit: input.measureUnits[colIdx] ?? 'EUR' };
        }
      }
    });

    return { dimensions, measures };
  }
}
