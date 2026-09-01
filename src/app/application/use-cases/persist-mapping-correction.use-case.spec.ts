import { TestBed } from '@angular/core/testing';
import { PersistMappingCorrectionUseCase } from './persist-mapping-correction.use-case';
import { MAPPING_RULE_REPOSITORY_TOKEN } from '@application/tokens';
import { MappingRuleRepository } from '@domain/repositories/mapping-rule.repository';
import { MappingRule } from '@domain/models/mapping-rule';
import { DetectedMapping } from '@domain/models/column-mapping';

describe('PersistMappingCorrectionUseCase', () => {
  let useCase: PersistMappingCorrectionUseCase;
  let upserted: MappingRule[];
  let repositoryMock: MappingRuleRepository;

  beforeEach(() => {
    upserted = [];
    repositoryMock = {
      getAll: async () => [],
      upsert: async (rule: Readonly<MappingRule>) => { upserted.push(rule); },
      delete: async () => { },
      clear: async () => { }
    };

    TestBed.configureTestingModule({
      providers: [
        PersistMappingCorrectionUseCase,
        { provide: MAPPING_RULE_REPOSITORY_TOKEN, useValue: repositoryMock }
      ]
    });
    useCase = TestBed.inject(PersistMappingCorrectionUseCase);
  });

  it('persists the correction under the signature derived from the headers', async () => {
    const headers = ['Data Valor', 'Descritivo', 'Valor Movimento'];
    const mapping: DetectedMapping = {
      date: { columnIndex: 0, confidence: 1 },
      desc: { columnIndex: 1, confidence: 1 },
      amount: { columnIndex: 2, confidence: 1 }
    };

    await useCase.execute(headers, mapping);

    expect(upserted).toHaveLength(1);
    expect(upserted[0].signatureKey).toBe('data valor|descritivo|valor movimento');
    expect(upserted[0].mapping).toEqual(mapping);
  });

  it('computes and stores a qualityBaseline when sampleRows are provided', async () => {
    const headers = ['Data', 'Movimento', 'Montante'];
    const mapping: DetectedMapping = {
      date: { columnIndex: 0, confidence: 1 },
      desc: { columnIndex: 1, confidence: 1 },
      amount: { columnIndex: 2, confidence: 1 }
    };
    const sampleRows = [['23/07/2026', 'RESTAURANTE XPTO', '-25,30']];

    await useCase.execute(headers, mapping, sampleRows);

    expect(upserted).toHaveLength(1);
    expect(upserted[0].qualityBaseline?.dateParseRate).toBe(1);
    expect(upserted[0].qualityBaseline?.numericParseRate).toBe(1);
    expect(upserted[0].qualityBaseline?.sampleSize).toBe(1);
  });

  it('does nothing when no repository is available', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [PersistMappingCorrectionUseCase] });
    const useCaseWithoutRepo = TestBed.inject(PersistMappingCorrectionUseCase);

    await expect(useCaseWithoutRepo.execute(['a', 'b'], {})).resolves.toBeUndefined();
  });
});
