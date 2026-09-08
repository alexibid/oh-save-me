import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetectStickyDirective } from './detect-sticky.directive';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';

@Component({
  template: `
    <div ohsavemeDetectSticky (stickyChange)="onStickyChange($event)">
      Test Content
    </div>
  `,
  standalone: true,
  imports: [DetectStickyDirective]
})
class TestHostComponent {
  isSticky = false;
  onStickyChange(sticky: boolean) {
    this.isSticky = sticky;
  }
}

describe('DetectStickyDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let directiveElement: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, DetectStickyDirective]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    directiveElement = fixture.nativeElement.querySelector('div') as HTMLElement;

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('adds event listeners on ngOnInit', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    fixture.destroy();

    const fixture2 = TestBed.createComponent(TestHostComponent);
    fixture2.detectChanges();

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('removes event listeners on ngOnDestroy', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    fixture.destroy();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('emits true when getBoundingClientRect().top is less than or equal to 111', () => {
    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 110 });

    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isSticky).toBe(true);
  });

  it('emits false when getBoundingClientRect().top is greater than 111', () => {
    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });
    window.dispatchEvent(new Event('scroll'));

    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 112 });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isSticky).toBe(false);
  });

  it('does not emit more than once while the state holds', () => {
    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });
    const spy = vi.spyOn(component, 'onStickyChange');

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(component.isSticky).toBe(true);
  });
});
