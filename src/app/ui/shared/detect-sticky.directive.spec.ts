import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetectStickyDirective } from './detect-sticky.directive';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';

@Component({
  template: `
    <div ohsavemeDetectSticky (stickyChange)="onStickyChange($event)">
      Conteúdo de Teste
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

  it('deve adicionar event listeners no ngOnInit', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    fixture.destroy();

    const fixture2 = TestBed.createComponent(TestHostComponent);
    fixture2.detectChanges();

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('deve remover event listeners no ngOnDestroy', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    fixture.destroy();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('deve emitir true quando getBoundingClientRect().top for menor ou igual a 111', () => {
    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 110 });

    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isSticky).toBe(true);
  });

  it('deve emitir false quando getBoundingClientRect().top for maior que 111', () => {
    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });
    window.dispatchEvent(new Event('scroll'));

    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 112 });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isSticky).toBe(false);
  });

  it('nao deve emitir multiplas vezes se o estado nao mudar', () => {
    directiveElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });
    const spy = vi.spyOn(component, 'onStickyChange');

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(component.isSticky).toBe(true);
  });
});
