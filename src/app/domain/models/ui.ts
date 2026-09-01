export interface StatCardData {
    label: string;
    value: number | string;
    isCurrency?: boolean;
    icon: string;
    theme?: StatTheme;
}

export type StatTheme = 'primary' | 'success' | 'danger' | 'warning' | 'neutral';