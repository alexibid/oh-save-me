import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';

import { PerformanceMonitorService } from '@application/services/performance-monitor.service';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';

@Component({
  selector: 'ohsaveme-loading-curtain',
  standalone: true,
  imports: [...I18N_SHARED],
  templateUrl: './loading-curtain.html',
  styleUrl: './loading-curtain.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingCurtainComponent {
  protected readonly monitor = inject(PerformanceMonitorService);
  protected readonly i18n = inject(I18nService);
  protected readonly showTimer = isDevMode();
}
