import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StackedDeckComponent } from './stacked-deck';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { GetAssistantSuggestionsUseCase } from '@application/use-cases/get-assistant-suggestions.use-case';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';
import { signal } from '@angular/core';

describe('StackedDeckComponent', () => {
  let component: StackedDeckComponent;
  let fixture: ComponentFixture<StackedDeckComponent>;
  let mockUseCase: Partial<GetAssistantSuggestionsUseCase>;

  beforeEach(async () => {
    mockUseCase = {
      activeSuggestions: signal([]),
    };

    await TestBed.configureTestingModule({
      imports: [StackedDeckComponent],
      providers: [
        { provide: APP_STORE_TOKEN, useValue: createMockStore() },
        { provide: GetAssistantSuggestionsUseCase, useValue: mockUseCase },
        SuggestionDismissalService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StackedDeckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('resets dismissal when onUnarchived is called', () => {
    const dismissalService = TestBed.inject(SuggestionDismissalService);
    const spy = vi.spyOn(dismissalService, 'reset');
    const mockCard: any = { id: 'test-1', kind: 'no_accounts' };

    component.onUnarchived(mockCard);
    expect(spy).toHaveBeenCalledWith('no_accounts', 'test-1');
  });

  it('clears all dismissals when onClearArchive is called', () => {
    const dismissalService = TestBed.inject(SuggestionDismissalService);
    const spy = vi.spyOn(dismissalService, 'clearAll');

    component.onClearArchive();
    expect(spy).toHaveBeenCalled();
  });
});
