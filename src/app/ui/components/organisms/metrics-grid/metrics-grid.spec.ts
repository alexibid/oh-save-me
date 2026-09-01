import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MetricsGridComponent } from './metrics-grid';

describe('MetricsGridComponent', () => {
  let component: MetricsGridComponent;
  let fixture: ComponentFixture<MetricsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricsGridComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MetricsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render cards', () => {
    component.balance = 2500;
    component.totalIncome = 5000;
    component.totalExpenses = -2500;
    component.budgetPercent = 50;
    component.budgetLimit = 5000;

    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
