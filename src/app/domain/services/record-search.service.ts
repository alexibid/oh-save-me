import { RecordListSchema } from '@domain/models/record-list-schema';

function toSearchableStrings(value: unknown): readonly string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(toSearchableStrings);
  return [String(value).toLowerCase()];
}

export function flattenSearchableFields<T>(record: T, schema: RecordListSchema<T>): readonly string[] {
  return schema.columns
    .filter(column => column.searchable)
    .flatMap(column => toSearchableStrings(column.accessor(record)));
}

export function matchesQuery<T>(record: T, schema: RecordListSchema<T>, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return flattenSearchableFields(record, schema).some(field => field.includes(normalized));
}
