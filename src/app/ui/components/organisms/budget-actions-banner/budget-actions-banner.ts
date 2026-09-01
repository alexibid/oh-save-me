import { Component, Output, EventEmitter, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { ButtonComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-budget-actions-banner',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, ...I18N_SHARED],
  templateUrl: './budget-actions-banner.html',
  styleUrl: './budget-actions-banner.scss'
})
export class BudgetActionsBanner implements AfterViewInit, OnDestroy {
  @Input() enableFab = true;
  @Input() labelKey = 'budgetCreateBtn';
  @Output() openProjectWizard = new EventEmitter<void>();
  @ViewChild('anchor') anchorRef!: ElementRef<HTMLElement>;

  protected isSticky = signal(false);
  private observer: IntersectionObserver | null = null;

  ngAfterViewInit() {
    if (this.enableFab && typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(([entry]) => {
        this.isSticky.set(!entry.isIntersecting);
      }, { threshold: 0 });
      this.observer.observe(this.anchorRef.nativeElement);
    }
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  onOpenWizard() {
    this.openProjectWizard.emit();
  }
}
