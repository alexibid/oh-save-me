import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssistantPeekDeckComponent } from './assistant-peek-deck';
import { AssistantSuggestion } from '@domain/models/assistant-suggestion.model';

describe('AssistantPeekDeckComponent', () => {
  let component: AssistantPeekDeckComponent;
  let fixture: ComponentFixture<AssistantPeekDeckComponent>;

  const mockSuggestions: readonly AssistantSuggestion[] = [
    { id: '1', kind: 'no_accounts', icon: 'wallet-line', question: 'Q1', subtext: 'S1', filter: null, route: '/', action: 'open_add_entry' },
    { id: '2', kind: 'pending_triage', icon: 'checkbox-line', question: 'Q2', subtext: 'S2', filter: null, route: '/movements', action: null }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantPeekDeckComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantPeekDeckComponent);
    component = fixture.componentInstance;
    component.suggestions = mockSuggestions;
    component.frontIndex = 0;
    fixture.detectChanges();
  });

  it('should create and calculate card depth correctly', () => {
    expect(component).toBeTruthy();
    expect(component['depthOf'](0)).toBe(0);
    expect(component['depthOf'](1)).toBe(1);
  });

  it('should emit cardTapped when front card activated', () => {
    const spy = vi.spyOn(component.cardTapped, 'emit');
    component['onCardActivated'](mockSuggestions[0], 0);
    expect(spy).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('should emit rotateBy when non-front card activated', () => {
    const spy = vi.spyOn(component.rotateBy, 'emit');
    component['onCardActivated'](mockSuggestions[1], 1);
    expect(spy).toHaveBeenCalledWith(1);
  });
});
