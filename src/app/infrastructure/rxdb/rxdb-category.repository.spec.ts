import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbCategoryRepository } from './rxdb-category.repository';
import { CategoryInfo, TEMPLATE_CATEGORIES } from '@domain/models/category';

describe('RxdbCategoryRepository', () => {
  let repository: RxdbCategoryRepository;
  let dbService: RxDbDatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbCategoryRepository
      ]
    });
    repository = TestBed.inject(RxdbCategoryRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should return static template categories by default', async () => {
    const all = await repository.getAll();
    expect(all.length).toBe(TEMPLATE_CATEGORIES.length);
    expect(all.find(c => c.id === 'Housing')).toBeTruthy();
  });

  it('should save a custom category and return it merged with templates', async () => {
    const custom: CategoryInfo = {
      id: 'custom-cat-1',
      name: 'Custom Category',
      icon: 'pi-tag',
      color: '#ff0000'
    };

    await repository.save(custom);
    const all = await repository.getAll();
    expect(all.length).toBe(TEMPLATE_CATEGORIES.length + 1);

    const saved = all.find(c => c.id === 'custom-cat-1');
    expect(saved).toBeTruthy();
    expect(saved?.name).toBe('Custom Category');
    expect(saved?.color).toBe('#ff0000');
  });

  it('should delete a custom category', async () => {
    const custom: CategoryInfo = {
      id: 'custom-cat-1',
      name: 'Custom Category',
      icon: 'pi-tag',
      color: '#ff0000'
    };

    await repository.save(custom);
    let all = await repository.getAll();
    expect(all.length).toBe(TEMPLATE_CATEGORIES.length + 1);

    await repository.delete('custom-cat-1');
    all = await repository.getAll();
    expect(all.length).toBe(TEMPLATE_CATEGORIES.length);
    expect(all.find(c => c.id === 'custom-cat-1')).toBeFalsy();
  });

  it('preserves a template category\'s accountTypes after its enabled flag is overridden', async () => {
    const templateInvestments = TEMPLATE_CATEGORIES.find(c => c.id === 'Investments')!;
    expect(templateInvestments.accountTypes).toEqual(['investment']);

    await repository.save({ ...templateInvestments, enabled: false });

    const all = await repository.getAll();
    const merged = all.find(c => c.id === 'Investments');
    expect(merged?.enabled).toBe(false);
    expect(merged?.accountTypes).toEqual(['investment']);
  });

  it('should clear all custom categories', async () => {
    const custom1: CategoryInfo = {
      id: 'custom-cat-1',
      name: 'Custom 1',
      icon: 'pi-tag',
      color: '#ff0000'
    };
    const custom2: CategoryInfo = {
      id: 'custom-cat-2',
      name: 'Custom 2',
      icon: 'pi-tag',
      color: '#00ff00'
    };

    await repository.save(custom1);
    await repository.save(custom2);
    let all = await repository.getAll();
    expect(all.length).toBe(TEMPLATE_CATEGORIES.length + 2);

    await repository.clear();
    all = await repository.getAll();
    expect(all.length).toBe(TEMPLATE_CATEGORIES.length);
  });
});
