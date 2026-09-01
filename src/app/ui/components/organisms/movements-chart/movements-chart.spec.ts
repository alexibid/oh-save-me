import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovementsChartComponent } from './movements-chart';
import { Transaction } from '@domain/models/transaction';
import { I18nService } from '@ui/shared/i18n-shared';
import { OverlayModule } from '@angular/cdk/overlay';

describe('MovementsChartComponent', () => {
  let fixture: ComponentFixture<MovementsChartComponent>;

  const mockTransactions: Transaction[] = [
    { id: 'tx_1', date: '2026-06-01', description: 'Salário', amount: 1000, category: 'Income' },
    { id: 'tx_2', date: '2026-06-02', description: 'Renda', amount: -400, category: 'Housing' }
  ];

  const mockI18nService = {
    formatCurrency: (v: number) => `${v.toFixed(2)} €`,
    formatDate: (d: string) => d,
    translate: (k: string) => k
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovementsChartComponent, OverlayModule],
      providers: [
        { provide: I18nService, useValue: mockI18nService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MovementsChartComponent);
    fixture.componentRef.setInput('transactions', mockTransactions);
    fixture.componentRef.setInput('windowStart', '2026-06-01');
    fixture.componentRef.setInput('asOfDate', '2026-06-02');
  });

  it('should compute chart series driven by the given transactions', () => {
    fixture.detectChanges();
    const series = fixture.componentInstance.chartSeries();
    expect(series.length).toBeGreaterThan(0);
    const balanceSeries = series.find(s => s.name === 'saldo');
    expect(balanceSeries).toBeDefined();
    expect(balanceSeries?.points.length).toBeGreaterThan(0);
  });
});
