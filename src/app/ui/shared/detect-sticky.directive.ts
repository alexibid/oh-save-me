import { Directive, ElementRef, EventEmitter, NgZone, OnDestroy, OnInit, Output } from '@angular/core';

@Directive({
  selector: '[ohsavemeDetectSticky]',
  standalone: true
})
export class DetectStickyDirective implements OnInit, OnDestroy {
  @Output() stickyChange = new EventEmitter<boolean>();

  private isSticky = false;
  private ticking = false;

  constructor(
    private el: ElementRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, true);
      window.addEventListener('resize', this.onScroll);
    });
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('resize', this.onScroll);
  }

  private onScroll = () => {
    if (!this.ticking) {
      this.ticking = true;
      window.requestAnimationFrame(() => {
        this.checkSticky();
        this.ticking = false;
      });
    }
  };

  private checkSticky() {
    const currentTop = this.el.nativeElement.getBoundingClientRect().top;
    const currentlySticky = currentTop <= 111;

    if (currentlySticky !== this.isSticky) {
      this.isSticky = currentlySticky;

      this.ngZone.run(() => {
        this.stickyChange.emit(this.isSticky);
      });
    }
  }
}
