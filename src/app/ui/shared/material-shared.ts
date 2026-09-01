import { A11yModule } from '@angular/cdk/a11y';
import { BidiModule } from '@angular/cdk/bidi';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { DialogModule } from '@angular/cdk/dialog';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LayoutModule } from '@angular/cdk/layout';
import { CdkMenuModule } from '@angular/cdk/menu';
import { ObserversModule } from '@angular/cdk/observers';
import { OverlayModule } from '@angular/cdk/overlay';
import { PlatformModule } from '@angular/cdk/platform';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CdkTreeModule } from '@angular/cdk/tree';

export const MATERIAL_SHARED = [
  A11yModule,
  BidiModule,
  ClipboardModule,
  DialogModule,
  DragDropModule,
  LayoutModule,
  CdkMenuModule,
  ObserversModule,
  OverlayModule,
  PlatformModule,
  PortalModule,
  ScrollingModule,
  CdkStepperModule,
  CdkTableModule,
  TextFieldModule,
  CdkTreeModule
] as const;

export {
  A11yModule,
  BidiModule,
  ClipboardModule,
  DialogModule,
  DragDropModule,
  LayoutModule,
  CdkMenuModule,
  ObserversModule,
  OverlayModule,
  PlatformModule,
  PortalModule,
  ScrollingModule,
  CdkStepperModule,
  CdkTableModule,
  TextFieldModule,
  CdkTreeModule
};
