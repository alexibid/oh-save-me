import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DbHistoryLogsComponent } from './db-history-logs';
import { I18nService } from '@application/i18n.service';
import { HistoryLog } from '@domain/models/history-log';

const createMockI18nService = () => ({
      currentLang: () => 'pt',
      t: () => ({
        dbHistoryTitle: 'Histórico de Alterações e Undo',
        dbHistoryEmpty: 'Nenhuma alteração recente registada para Undo.',
        dbUndo: 'Desfazer',
        dbHistoryTransaction: 'Movimento'
      })
    });

describe('DbHistoryLogsComponent', () => {
  let component: DbHistoryLogsComponent;
  let fixture: ComponentFixture<DbHistoryLogsComponent>;
  let mockI18nService: ReturnType<typeof createMockI18nService>;

  beforeEach(async () => {
    mockI18nService = createMockI18nService();

    await TestBed.configureTestingModule({
      imports: [DbHistoryLogsComponent],
      providers: [
        { provide: I18nService, useValue: mockI18nService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DbHistoryLogsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty message when logs array is empty', () => {
    component.logs = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhuma alteração recente registada para Undo.');
  });

  it('should list logs and emit undo event when click undo', () => {
    const mockLogs: HistoryLog[] = [
      {
        id: '123',
        action: 'INSERT',
        entity: 'transaction',
        entityId: 't-1',
        timestamp: '2026-07-29T22:47:48Z'
      }
    ];
    component.logs = mockLogs;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Movimento');

    let emittedId: string | undefined;
    component.undo.subscribe(id => emittedId = id);

    const button = compiled.querySelector('ibid-button button') as HTMLElement;
    button?.click();
    expect(emittedId).toBe('123');
  });
});
