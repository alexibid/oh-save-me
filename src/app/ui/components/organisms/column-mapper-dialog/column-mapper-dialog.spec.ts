import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ColumnMapperDialogComponent } from './column-mapper-dialog';
import { SimpleChange, signal } from '@angular/core';
import { APP_STORE_TOKEN } from '@application/app-store';
import { BUILTIN_UNITS } from '@domain/models/unit';

describe('ColumnMapperDialogComponent', () => {
  let component: ColumnMapperDialogComponent;
  let fixture: ComponentFixture<ColumnMapperDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapperDialogComponent],
      providers: [{ provide: APP_STORE_TOKEN, useValue: { units: signal([...BUILTIN_UNITS]) } }]
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnMapperDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default all mappings to skip on load', () => {
    component.fileName = 'test.csv';
    component.requiredFields = [
      { role: 'date', label: 'Date' },
      { role: 'desc', label: 'Description' },
      { role: 'amount', label: 'Amount' }
    ];
    component.rawRows = [
      ['Data de Movimento', 'Detalhes do Pagamento', 'Valor Debitado', 'Valor Creditado', 'Saldo'],
      ['22-07-2026', 'VIA VERDE', '2.80', '', '2800']
    ];

    component.ngOnChanges({
      rawRows: new SimpleChange(null, component.rawRows, true)
    });

    fixture.detectChanges();

    expect((component as any).mappings).toEqual(['skip', 'skip', 'skip', 'skip', 'skip']);
    expect((component as any).hasPendingMappings).toBe(true);
  });

  it('should require Credit and Balance for account types that need them', () => {
    component.fileName = 'test.csv';
    component.requiredFields = [
      { role: 'date', label: 'Date' },
      { role: 'desc', label: 'Description' },
      { role: 'amount', label: 'Debit' },
      { role: 'credit', label: 'Credit' },
      { role: 'balance', label: 'Balance' }
    ];
    component.rawRows = [
      ['Data', 'Descrição', 'Debito', 'Credito', 'Saldo'],
      ['22-07-2026', 'VIA VERDE', '2.80', '', '2800']
    ];

    component.ngOnChanges({
      rawRows: new SimpleChange(null, component.rawRows, true)
    });

    fixture.detectChanges();

    component.mappings = ['date', 'desc', 'amount', 'skip', 'skip'];
    expect((component as any).hasPendingMappings).toBe(true);

    component.mappings = ['date', 'desc', 'amount', 'credit', 'skip'];
    expect((component as any).hasPendingMappings).toBe(true);

    component.mappings = ['date', 'desc', 'amount', 'credit', 'balance'];
    expect((component as any).hasPendingMappings).toBe(false);
  });

  it('should NOT require Credit or Balance for account types that do not need them', () => {
    component.fileName = 'test.csv';
    component.requiredFields = [
      { role: 'date', label: 'Date' },
      { role: 'desc', label: 'Description' },
      { role: 'amount', label: 'Amount' }
    ];
    component.rawRows = [
      ['Date', 'Payee', 'Amount'],
      ['2026-07-22', 'Market', '-54.30']
    ];

    component.ngOnChanges({
      rawRows: new SimpleChange(null, component.rawRows, true)
    });

    fixture.detectChanges();

    component.mappings = ['date', 'desc', 'amount'];

    expect((component as any).hasPendingMappings).toBe(false);
  });

  describe('custom accounts (accountKind = "custom")', () => {
    beforeEach(() => {
      component.accountKind = 'custom';
      component.fileName = 'ev.csv';
      component.rawRows = [
        ['Data', 'kWh', 'Custo', 'Estação'],
        ['2026-07-15', '42.3', '12.50', 'IONITY Lisboa']
      ];
      component.ngOnChanges({
        rawRows: new SimpleChange(null, component.rawRows, true),
        accountKind: new SimpleChange('financial', 'custom', true)
      });
      fixture.detectChanges();
    });

    it('allows multiple columns to share the "measure" role without clearing each other', () => {
      component.onRoleChange(1, { target: { value: 'measure' } } as unknown as Event);
      component.onRoleChange(2, { target: { value: 'measure' } } as unknown as Event);

      expect(component['mappings'][1]).toBe('measure');
      expect(component['mappings'][2]).toBe('measure');
    });

    it('allows multiple columns to share the "dimension" role too', () => {
      component.onRoleChange(2, { target: { value: 'dimension' } } as unknown as Event);
      component.onRoleChange(3, { target: { value: 'dimension' } } as unknown as Event);

      expect(component['mappings'][2]).toBe('dimension');
      expect(component['mappings'][3]).toBe('dimension');
    });

    it('financial roles like "date" still stay exclusive to one column', () => {
      component.onRoleChange(0, { target: { value: 'date' } } as unknown as Event);

      expect(component['mappings'][0]).toBe('date');

      component.onRoleChange(2, { target: { value: 'date' } } as unknown as Event);
      expect(component['mappings'][2]).toBe('date');
      expect(component['mappings'][0]).not.toBe('date');
    });

    it('tracks a per-column unit for measure columns and clears it if the role changes away', () => {
      component.onRoleChange(1, { target: { value: 'measure' } } as unknown as Event);
      component['onMeasureUnitChange'](1, 'kWh');
      expect(component['measureUnits'][1]).toBe('kWh');

      component.onRoleChange(1, { target: { value: 'skip' } } as unknown as Event);
      expect(component['measureUnits'][1]).toBeUndefined();
    });
  });

  it('leaves the financial column-role options untouched by default (accountKind defaults to "financial")', () => {
    expect(component.accountKind).toBe('financial');
  });
});
