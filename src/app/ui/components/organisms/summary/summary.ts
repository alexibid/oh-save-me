import { Component, Input } from '@angular/core';

import { StatCardData } from '@domain/models/ui';
import { StatCardComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-summary',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <section class="o-summary">
      @for (item of items; track item.label) {
        <ibid-stat-card [data]="item"></ibid-stat-card>
      }
    </section>
  `,
  styleUrl: './summary.scss'
})
export class SummaryComponent {
  @Input() items: StatCardData[] = [];
}