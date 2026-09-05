import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { BottomSheetDialogComponent, ButtonComponent, CurrencyDisplayComponent } from 'ibid-ui';

export interface PositionSellSimulatorData {
  readonly assetName: string;
  readonly costBasis: number;
  readonly marketValue: number;
}

@Component({
  selector: 'ohsaveme-position-sell-simulator-dialog',
  standalone: true,
  imports: [CurrencyDisplayComponent, FormsModule, BottomSheetDialogComponent, ButtonComponent, ...I18N_SHARED],
  templateUrl: './position-sell-simulator-dialog.html',
  styleUrl: './position-sell-simulator-dialog.scss',
})
export class PositionSellSimulatorDialogComponent {
  private readonly dialogRef = inject(DialogRef<PositionSellSimulatorDialogComponent>);
  protected readonly i18n = inject(I18nService);
  protected readonly data = inject<PositionSellSimulatorData>(DIALOG_DATA);

  protected simulatedValue = this.data.marketValue;

  get costBasis(): number {
    return this.data.costBasis;
  }

  get grossGain(): number {
    return Math.max(0, Math.round((this.simulatedValue - this.costBasis) * 100) / 100);
  }

  get estimatedTax(): number {
    return Math.round(this.grossGain * 0.28 * 100) / 100;
  }

  get netPayout(): number {
    return Math.round((this.simulatedValue - this.estimatedTax) * 100) / 100;
  }

  get profitPct(): number {
    if (this.costBasis <= 0) return 0;
    return Math.round(((this.simulatedValue - this.costBasis) / this.costBasis) * 1000) / 10;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
