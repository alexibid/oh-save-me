export interface SuggestedMeasure {
  readonly hint: string;
  readonly unit: string;
  readonly label: string;
}

export interface SuggestedDimension {
  readonly hint: string;
  readonly label: string;
}

export type SuggestedView =
  | { readonly kind: 'total'; readonly measureHint: string; readonly label: string }
  | { readonly kind: 'average'; readonly measureHint: string; readonly label: string }
  | { readonly kind: 'trend'; readonly measureHint: string; readonly label: string }
  | { readonly kind: 'breakdown'; readonly measureHint: string; readonly dimensionHint: string; readonly label: string };

export interface CustomAccountPreset {
  readonly id: string;
  readonly category: string;
  readonly label: string;
  readonly suggestedMeasures: readonly SuggestedMeasure[];
  readonly suggestedDimensions: readonly SuggestedDimension[];
  readonly suggestedViews: readonly SuggestedView[];
}
