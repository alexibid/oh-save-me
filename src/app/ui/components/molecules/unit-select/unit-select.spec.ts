import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UnitSelectComponent } from './unit-select';
import { APP_STORE_TOKEN } from '@application/app-store';
import { Unit } from '@domain/models/unit';

describe('UnitSelectComponent', () => {
  let component: UnitSelectComponent;
  let fixture: ComponentFixture<UnitSelectComponent>;

  const units: Unit[] = [
    { code: 'EUR', symbol: '€', category: 'currency', label: 'Euro', custom: false },
    { code: 'USD', symbol: '$', category: 'currency', label: 'US Dollar', custom: false },
    { code: 'kWh', symbol: 'kWh', category: 'physical_measure', label: 'Kilowatt-hour', custom: false }
  ];

  beforeEach(async () => {
    const mockStore = { units: signal(units) };

    await TestBed.configureTestingModule({
      imports: [UnitSelectComponent],
      providers: [{ provide: APP_STORE_TOKEN, useValue: mockStore }]
    }).compileComponents();

    fixture = TestBed.createComponent(UnitSelectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups units into currency and physical-measure buckets', () => {
    expect(component['currencyUnits']().map(u => u.code)).toEqual(['EUR', 'USD']);
    expect(component['physicalMeasureUnits']().map(u => u.code)).toEqual(['kWh']);
  });

  it('restricts to a single category when [category] is set', () => {
    component.category = 'currency';

    expect(component['currencyUnits']().length).toBe(2);
    expect(component['physicalMeasureUnits']().length).toBe(0);
  });

  it('emits valueChange with the selected unit code', () => {
    let emitted: string | undefined;
    component.valueChange.subscribe(v => { emitted = v; });

    const fakeEvent = { target: { value: 'USD' } } as unknown as Event;
    component['onSelect'](fakeEvent);

    expect(emitted).toBe('USD');
  });
});
