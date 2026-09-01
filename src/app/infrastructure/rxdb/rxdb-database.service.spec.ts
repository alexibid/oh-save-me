import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';

describe('RxDbDatabaseService', () => {
  let service: RxDbDatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RxDbDatabaseService]
    });
    service = TestBed.inject(RxDbDatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize the database and collections', async () => {
    const db = await service.initDatabase();
    expect(db).toBeTruthy();
    expect(db.collections.transactions).toBeTruthy();
  });

  it('should allow fetching initialized database instance', async () => {
    await service.initDatabase();
    const db = await service.getDatabase();
    expect(db).toBeTruthy();
  });
});
