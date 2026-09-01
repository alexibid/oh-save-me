import { flattenSearchableFields, matchesQuery } from './record-search.service';
import { RecordListSchema } from '@domain/models/record-list-schema';

interface Fixture {
  readonly id: string;
  readonly description: string;
  readonly category: string;
  readonly tags?: readonly string[];
}

const schema: RecordListSchema<Fixture> = {
  idAccessor: f => f.id,
  columns: [
    { key: 'description', dataType: 'text', labelKey: 'x', primary: true, searchable: true, accessor: f => f.description },
    { key: 'category', dataType: 'category', labelKey: 'x', primary: true, searchable: true, accessor: f => f.category },
    { key: 'tags', dataType: 'mutedCaption', labelKey: 'x', primary: false, searchable: true, accessor: f => f.tags },
    { key: 'id', dataType: 'text', labelKey: 'x', primary: false, accessor: f => f.id }
  ]
};

const fixture = (overrides: Partial<Fixture>): Fixture => ({
  id: 'id',
  description: 'Continente',
  category: 'mercearia',
  ...overrides
});

describe('flattenSearchableFields', () => {
  it('only includes columns marked searchable, lowercased', () => {
    const result = flattenSearchableFields(fixture({ description: 'Continente' }), schema);

    expect(result).toContain('continente');
    expect(result).toContain('mercearia');
    expect(result).not.toContain('id');
  });

  it('flattens array-valued fields like tags', () => {
    const result = flattenSearchableFields(fixture({ tags: ['Casa', 'Recorrente'] }), schema);

    expect(result).toEqual(expect.arrayContaining(['casa', 'recorrente']));
  });

  it('omits undefined fields without throwing', () => {
    const result = flattenSearchableFields(fixture({ tags: undefined }), schema);

    expect(result).toEqual(expect.arrayContaining(['continente', 'mercearia']));
  });
});

describe('matchesQuery', () => {
  it('matches on a case-insensitive substring of the description', () => {
    expect(matchesQuery(fixture({ description: 'Continente' }), schema, 'conti')).toBe(true);
  });

  it('matches on category', () => {
    expect(matchesQuery(fixture({ category: 'mercearia' }), schema, 'merce')).toBe(true);
  });

  it('matches on a tag', () => {
    expect(matchesQuery(fixture({ tags: ['recorrente'] }), schema, 'recorr')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesQuery(fixture({}), schema, 'inexistente')).toBe(false);
  });

  it('returns true for an empty or blank query', () => {
    expect(matchesQuery(fixture({}), schema, '')).toBe(true);
    expect(matchesQuery(fixture({}), schema, '   ')).toBe(true);
  });
});
