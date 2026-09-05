import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssistantExpandedDeckComponent } from './assistant-expanded-deck';
import { AssistantSuggestion } from '@domain/models/assistant-suggestion.model';

describe('AssistantExpandedDeckComponent', () => {
  let component: AssistantExpandedDeckComponent;
  let fixture: ComponentFixture<AssistantExpandedDeckComponent>;

  const mockSuggestions: readonly AssistantSuggestion[] = [
    { id: '1', kind: 'no_accounts', icon: 'wallet-line', question: 'Q1', subtext: 'S1', filter: null, route: '/', action: 'open_add_entry' },
    { id: '2', kind: 'pending_triage', icon: 'checkbox-line', question: 'Q2', subtext: 'S2', filter: null, route: '/movements', action: null },
    { id: '3', kind: 'uncategorized', icon: 'question-line', question: 'Q3', subtext: 'S3', filter: null, route: '/movements', action: null },
    { id: '4', kind: 'positive_savings', icon: 'arrow-up-line', question: 'Q4', subtext: 'S4', filter: null, route: '/movements', action: null },
    { id: '5', kind: 'category_overspend', icon: 'alert-line', question: 'Q5', subtext: 'S5', filter: null, route: '/movements', action: null }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantExpandedDeckComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantExpandedDeckComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('suggestions', mockSuggestions);
    fixture.componentRef.setInput('frontIndex', 0);
    fixture.detectChanges();
  });

  it('should create and compute visible items correctly', () => {
    expect(component).toBeTruthy();
    expect(component['visibleItems']().length).toBe(4);
    expect(component['hasMorePages']()).toBe(true);
  });

  it('should emit rotateBy on next page click', () => {
    const spy = vi.spyOn(component.rotateBy, 'emit');
    component.onNextPage();
    expect(spy).toHaveBeenCalledWith(3);
  });

  it('should switch to archived tab and display archived items', () => {
    fixture.componentRef.setInput('archivedSuggestions', [mockSuggestions[0]]);
    fixture.detectChanges();

    component['currentTab'].set('archived');
    fixture.detectChanges();

    const archivedItem = fixture.nativeElement.querySelector('.m-assistant-expanded-deck__archived-item');
    expect(archivedItem).toBeTruthy();
    expect(archivedItem.textContent).toContain('Q1');
  });

  it('should emit unarchived when restore button is clicked', () => {
    const spy = vi.spyOn(component.unarchived, 'emit');
    fixture.componentRef.setInput('archivedSuggestions', [mockSuggestions[0]]);
    component['currentTab'].set('archived');
    fixture.detectChanges();

    const restoreBtn = fixture.nativeElement.querySelector('.m-assistant-expanded-deck__archived-action--restore');
    restoreBtn.click();

    expect(spy).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('should emit deleted when delete button is clicked', () => {
    const spy = vi.spyOn(component.deleted, 'emit');
    fixture.componentRef.setInput('archivedSuggestions', [mockSuggestions[0]]);
    component['currentTab'].set('archived');
    fixture.detectChanges();

    const deleteBtn = fixture.nativeElement.querySelector('.m-assistant-expanded-deck__archived-action--delete');
    deleteBtn.click();

    expect(spy).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('should emit clearArchive when clear button is clicked', () => {
    const spy = vi.spyOn(component.clearArchive, 'emit');
    fixture.componentRef.setInput('archivedSuggestions', [mockSuggestions[0]]);
    component['currentTab'].set('archived');
    fixture.detectChanges();

    const clearBtn = fixture.nativeElement.querySelector('.m-assistant-expanded-deck__clear-btn');
    clearBtn.click();

    expect(spy).toHaveBeenCalled();
  });
});
