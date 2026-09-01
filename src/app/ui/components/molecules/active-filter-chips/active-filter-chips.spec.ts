import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveFilterChipsComponent } from './active-filter-chips';
import { I18nService } from '@ui/shared/i18n-shared';

describe('ActiveFilterChipsComponent', () => {
  let fixture: ComponentFixture<ActiveFilterChipsComponent>;

  const mockI18nService = { translate: (_key: string, fallback?: string) => fallback ?? 'limpar tudo' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveFilterChipsComponent],
      providers: [{ provide: I18nService, useValue: mockI18nService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveFilterChipsComponent);
  });

  it('renders nothing when there are no active filters', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.m-active-filter-chips')).toBeFalsy();
  });

  it('renders one chip per active filter, tinting only the one with a category color', () => {
    fixture.componentRef.setInput('chips', [
      { id: 'account', label: 'conta: cartão de crédito' },
      { id: 'category', label: 'mercearia', color: '#10b981' }
    ]);
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('.m-active-filter-chips__chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].classList.contains('m-active-filter-chips__chip--tinted')).toBe(false);
    expect(chips[1].classList.contains('m-active-filter-chips__chip--tinted')).toBe(true);
    expect(chips[1].style.getPropertyValue('--category-color')).toBe('#10b981');
  });

  it('emits remove with the chip id when its remove button is clicked', () => {
    fixture.componentRef.setInput('chips', [{ id: 'account', label: 'conta: cartão de crédito' }]);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.remove.subscribe((id: string) => emitted.push(id));

    fixture.nativeElement.querySelector('.m-active-filter-chips__remove').click();

    expect(emitted).toEqual(['account']);
  });

  it('emits clearAll when "limpar tudo" is clicked', () => {
    fixture.componentRef.setInput('chips', [{ id: 'account', label: 'x' }]);
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentInstance.clearAll.subscribe(() => emitted.push(1));

    fixture.nativeElement.querySelector('.m-active-filter-chips__clear-all').click();

    expect(emitted).toEqual([1]);
  });
});
