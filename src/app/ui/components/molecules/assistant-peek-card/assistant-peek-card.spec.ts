import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssistantPeekCardComponent } from './assistant-peek-card';
import { AssistantSuggestion } from '@domain/models/assistant-suggestion.model';

describe('AssistantPeekCardComponent', () => {
  let component: AssistantPeekCardComponent;
  let fixture: ComponentFixture<AssistantPeekCardComponent>;

  const mockSuggestion: AssistantSuggestion = {
    id: 's1',
    kind: 'no_accounts',
    icon: 'wallet-line',
    question: 'No active accounts',
    subtext: 'Add your first account.',
    filter: null,
    route: '/',
    action: 'open_add_entry'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantPeekCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantPeekCardComponent);
    component = fixture.componentInstance;
    component.suggestion = mockSuggestion;
    component.depth = 0;
    fixture.detectChanges();
  });

  it('should create and display suggestion content', () => {
    expect(component).toBeTruthy();
    const label = fixture.nativeElement.querySelector('.m-assistant-peek-card__label');
    expect(label.textContent).toContain('No active accounts');
  });

  it('should expand on card click when front card', () => {
    expect(component.isExpanded()).toBe(false);
    const card = fixture.nativeElement.querySelector('.m-assistant-peek-card');
    card.click();
    expect(component.isExpanded()).toBe(true);
  });

  it('should emit activated on card click when depth > 0', () => {
    component.depth = 1;
    fixture.detectChanges();
    const spy = vi.spyOn(component.activated, 'emit');
    const card = fixture.nativeElement.querySelector('.m-assistant-peek-card');
    card.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should render action button and emit activated when clicked', () => {
    const spy = vi.spyOn(component.activated, 'emit');
    const actionBtn = fixture.nativeElement.querySelector('.m-assistant-peek-card__action-btn');
    expect(actionBtn).toBeTruthy();
    actionBtn.click();
    expect(spy).toHaveBeenCalled();
  });
});
