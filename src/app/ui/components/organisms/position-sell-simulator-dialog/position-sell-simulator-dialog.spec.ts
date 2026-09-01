import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { PositionSellSimulatorDialogComponent, PositionSellSimulatorData } from './position-sell-simulator-dialog';
import { I18nService } from '@application/i18n.service';

describe('PositionSellSimulatorDialogComponent', () => {
  let component: PositionSellSimulatorDialogComponent;
  let fixture: ComponentFixture<PositionSellSimulatorDialogComponent>;
  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockData: PositionSellSimulatorData = {
    assetName: 'IWDA ETF',
    costBasis: 1000,
    marketValue: 1500,
  };

  beforeEach(async () => {
    mockDialogRef.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [PositionSellSimulatorDialogComponent],
      providers: [
        { provide: DialogRef, useValue: mockDialogRef },
        { provide: DIALOG_DATA, useValue: mockData },
        I18nService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PositionSellSimulatorDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and calculate capital gains correctly', () => {
    expect(component).toBeTruthy();
    expect(component.costBasis).toBe(1000);
    expect(component.grossGain).toBe(500);
    expect(component.estimatedTax).toBe(140);
    expect(component.netPayout).toBe(1360);
    expect(component.profitPct).toBe(50);
  });

  it('should close dialog when requested', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
