import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ColumnManagerPanelComponent, ColumnManagerItem } from './column-manager-panel';
import { I18nService } from '@ui/shared/i18n-shared';

describe('ColumnManagerPanelComponent', () => {
  let fixture: ComponentFixture<ColumnManagerPanelComponent>;

  const mockI18nService = { translate: (_key: string, fallback?: string) => fallback ?? '' };

  const items: readonly ColumnManagerItem[] = [
    { key: 'date', labelKey: 'thDate', visible: true, locked: true },
    { key: 'balance', labelKey: 'movementsHeaderBalance', visible: false, locked: false },
    { key: 'account', labelKey: 'movementsHeaderAccount', visible: false, locked: false }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnManagerPanelComponent],
      providers: [{ provide: I18nService, useValue: mockI18nService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnManagerPanelComponent);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  });

  it('starts closed', () => {
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });

  it('opens and closes on toggle', () => {
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance['isOpen']()).toBe(true);
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });

  it('emits visibilityChange with the flipped state for an unlocked column', () => {
    const emitted: { key: string; visible: boolean }[] = [];
    fixture.componentInstance.visibilityChange.subscribe(e => emitted.push(e));

    fixture.componentInstance.onToggleVisibility(items[1]);

    expect(emitted).toEqual([{ key: 'balance', visible: true }]);
  });

  it('does not emit visibilityChange for a locked column', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.visibilityChange.subscribe(e => emitted.push(e));

    fixture.componentInstance.onToggleVisibility(items[0]);

    expect(emitted).toHaveLength(0);
  });

  it('emits reorder with the drop indices when they differ', () => {
    const emitted: { previousIndex: number; currentIndex: number }[] = [];
    fixture.componentInstance.reorder.subscribe(e => emitted.push(e));

    fixture.componentInstance.onDrop({ previousIndex: 1, currentIndex: 2 } as unknown as CdkDragDrop<unknown>);

    expect(emitted).toEqual([{ previousIndex: 1, currentIndex: 2 }]);
  });

  it('does not emit reorder when the drop index is unchanged', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.reorder.subscribe(e => emitted.push(e));

    fixture.componentInstance.onDrop({ previousIndex: 1, currentIndex: 1 } as unknown as CdkDragDrop<unknown>);

    expect(emitted).toHaveLength(0);
  });

  it('closes on Escape when open', () => {
    fixture.componentInstance.toggle();
    fixture.componentInstance['onEscape']();
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });
});
