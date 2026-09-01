import { Component, Input, Output, EventEmitter, inject, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, AppTranslatePipe } from '@ui/shared/i18n-shared';
import { Language } from '@application/i18n.service';
import { ButtonComponent, DividerComponent, FormFieldComponent, IconComponent, NumberInputComponent, SelectComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    SelectComponent,
    IconComponent,
    NumberInputComponent,
    FormFieldComponent,
    DividerComponent,
    AppTranslatePipe
  ],
  template: `
    <div class="m-settings-panel">
      <ibid-button
        variant="outlined"
        (clicked)="toggleSettings($event)"
        class="m-settings-panel__btn"
      >
        <ibid-icon name="settings"></ibid-icon>
      </ibid-button>

      @if (showSettings()) {
        <div class="m-settings-panel__dropdown">
          <ibid-form-field [label]="'languageLabel' | translate:'Idioma'">
            <ibid-select
              [value]="currentLang"
              [options]="languageOptions"
              (valueChange)="onLanguageChange($event)"
            ></ibid-select>
          </ibid-form-field>

          <ibid-form-field [label]="'startDayLabel' | translate:'Dia de Início'">
            <ibid-number-input
              [value]="cycleStartDay"
              [min]="1"
              [max]="31"
              (valueChange)="onStartDayChange($event)"
            ></ibid-number-input>
          </ibid-form-field>

          <ibid-divider class="m-settings-panel__divider"></ibid-divider>

          <div class="m-settings-panel__reset-container">
            <ibid-button
              variant="outlined"
              class="m-settings-panel__reset-btn"
              (clicked)="onResetClick($event)"
            >
              <ibid-icon name="delete_forever" iconClass="m-settings-panel__reset-icon"></ibid-icon>
              <span>{{ 'resetBtn' | translate:'Repor Predefinições' }}</span>
            </ibid-button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './settings-panel.scss'
})
export class SettingsPanelComponent {
  protected readonly i18n = inject(I18nService);
  private readonly elementRef = inject(ElementRef);

  @Input({ required: true }) cycleStartDay!: number;
  @Input({ required: true }) currentLang!: Language;

  @Output() cycleStartDayChange = new EventEmitter<number>();
  @Output() languageChange = new EventEmitter<Language>();
  @Output() resetImports = new EventEmitter<void>();

  protected readonly showSettings = signal<boolean>(false);

  protected readonly languageOptions = [
    { value: 'pt', label: 'PT' },
    { value: 'en', label: 'EN' }
  ];

  toggleSettings(event: Event) {
    event.stopPropagation();
    this.showSettings.update(prev => !prev);
  }

  onLanguageChange(lang: string) {
    this.languageChange.emit(lang as Language);
  }

  onStartDayChange(day: number) {
    this.cycleStartDayChange.emit(day);
  }

  onResetClick(event: Event) {
    event.stopPropagation();
    this.showSettings.set(false);
    this.resetImports.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showSettings.set(false);
    }
  }
}
