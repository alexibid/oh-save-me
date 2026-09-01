import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecordDetailBalloonComponent } from './record-detail-balloon';
import { I18nService } from '@ui/shared/i18n-shared';
import { TRANSACTION_LIST_SCHEMA } from '@domain/models/transaction-list-schema';
import { Transaction } from '@domain/models/transaction';

describe('RecordDetailBalloonComponent', () => {
  let fixture: ComponentFixture<RecordDetailBalloonComponent>;

  const mockI18nService = {
    translate: (key: string) => key,
    currentLang: () => 'pt' as const,
    getCategoryName: (id: string) => id,
    formatCurrency: (v: number) => `${v} €`
  };

  const transaction: Transaction = {
    id: 't1',
    date: '2026-08-02',
    description: 'continente',
    amount: -84.2,
    category: 'Groceries',
    balance: 12480,
    account: 'principal',
    budgetId: undefined
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordDetailBalloonComponent],
      providers: [{ provide: I18nService, useValue: mockI18nService }]
    }).compileComponents();

    fixture = TestBed.createComponent(RecordDetailBalloonComponent);
    fixture.componentRef.setInput('record', transaction);
    fixture.componentRef.setInput('schema', TRANSACTION_LIST_SCHEMA);
    fixture.detectChanges();
  });

  it('starts closed', () => {
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });

  it('opens on toggle and closes on a second toggle', () => {
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance['isOpen']()).toBe(true);

    fixture.componentInstance.toggle();
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });

  it('closes on close()', () => {
    fixture.componentInstance.toggle();
    fixture.componentInstance.close();
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });

  it('only lists secondary (non-primary) schema columns', () => {
    const keys = fixture.componentInstance['secondaryColumns']().map(c => c.key);
    expect(keys).toEqual(['balance', 'account', 'budget', 'tags']);
  });

  it('emits pinToggle and closes when the pin action is used', () => {
    fixture.componentInstance.toggle();
    const emitted: void[] = [];
    fixture.componentInstance.pinToggle.subscribe(() => emitted.push(undefined));

    fixture.componentInstance.onPinToggle();

    expect(emitted).toHaveLength(1);
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });

  it('closes on Escape when open', () => {
    fixture.componentInstance.toggle();
    fixture.componentInstance['onEscape']();
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });
});
