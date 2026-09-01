import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DbDataViewerComponent } from './db-data-viewer';
import { I18nService } from '@application/i18n.service';

describe('DbDataViewerComponent', () => {
  let component: DbDataViewerComponent;
  let fixture: ComponentFixture<DbDataViewerComponent>;
  let mockI18nService: any;

  beforeEach(async () => {
    mockI18nService = {
      currentLang: () => 'pt',
      t: () => ({
        dbViewerTitle: 'Visualizador de Dados:',
        dbViewerEmpty: 'Esta tabela física não contém registos.',
        dbRecordDetails: 'Detalhes do Registo',
        dbViewerRecordAction: 'Ação',
        dbUndo: 'Desfazer',
        dbRestore: 'Restaurar'
      })
    };

    await TestBed.configureTestingModule({
      imports: [DbDataViewerComponent],
      providers: [
        { provide: I18nService, useValue: mockI18nService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DbDataViewerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render rows list correctly and format details', () => {
    component.dbName = 'rxdb-dexie-app_db--1--transactions';
    component.friendlyName = 'Transações';
    component.rows = [
      {
        id: 'tx-1',
        date: '2026-07-30',
        description: 'Supermercado',
        amount: -25.5,
        category: 'groceries',
        account: 'carteira'
      }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('tx-1');
    expect(compiled.textContent).toContain('Supermercado');
    expect(compiled.textContent).toContain('-25.5');

  });

  it('should emit close event when click close button', () => {
    component.dbName = 'rxdb-dexie-app_db--1--transactions';
    component.friendlyName = 'Transações';
    component.rows = [];
    fixture.detectChanges();

    let closed = false;
    component.close.subscribe(() => closed = true);

    const closeBtn = fixture.nativeElement.querySelector('button') as HTMLElement;
    closeBtn?.click();
    expect(closed).toBe(true);
  });

  it('should emit restore event when click restore button', () => {
    component.dbName = 'rxdb-dexie-app_db--1--transactions';
    component.friendlyName = 'Transações';
    component.rows = [
      { id: 'tx-1', date: '2026-07-30', description: 'Teste' }
    ];
    fixture.detectChanges();

    let restoredRow: any;
    component.restore.subscribe(row => restoredRow = row);

    const restoreBtn = fixture.nativeElement.querySelector('ibid-button button') as HTMLElement;
    restoreBtn?.click();
    expect(restoredRow.id).toBe('tx-1');
  });
});
