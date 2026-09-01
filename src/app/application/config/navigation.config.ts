export enum NavigationItemId {
    Dashboard = 'dashboard',
    Categories = 'categories',
    ManageCategories = 'manage-categories',
    Settings = 'settings',
    LanguageToggle = 'language-toggle',
    Budget = 'budget',
    Portfolio = 'portfolio',
    Movements = 'movements',
    Database = 'database',
}

export interface NavigationLink {
    id: string;
    type: 'link';
    labelKey: string;
    icon?: string;
    svgIcon?: string;
    route: string | readonly (string | number)[];
    exact?: boolean;
    color?: string;
    isTranslationKey?: boolean;
}

export interface NavigationChildData {
    id: string;
    name: string;
    color?: string;
    icon?: string;
}

export interface NavigationExpandable {
    id: string;
    type: 'expandable';
    labelKey: string;
    icon?: string;
    svgIcon?: string;
    expandSignalKey: string;
    emptyFallbackKey?: string;
    emptyFallbackRoute?: string;
    children?: NavigationLink[] | ((data: NavigationChildData[]) => NavigationLink[]);
}

export interface NavigationAction {
    id: string;
    type: 'action';
    labelKey?: string;
    icon: string;
    svgIcon?: string;
    actionMethod: string;
}

export type NavigationItem = NavigationLink | NavigationExpandable | NavigationAction;

export const MAIN_MENU_ITEMS: NavigationItem[] = [
    {
        id: NavigationItemId.Categories,
        type: 'expandable',
        labelKey: 'categoriesBtn',
        icon: 'grid',
        svgIcon: 'categories',
        expandSignalKey: 'isCategoriesExpanded',
        emptyFallbackKey: 'noCategoriesFound',
        emptyFallbackRoute: '/categories',
        children: (items: NavigationChildData[]): NavigationLink[] => {
            return (items ?? []).map(item => ({
                id: item.id,
                type: 'link' as const,
                labelKey: item.name,
                isTranslationKey: false,
                route: ['/categories/list', item.id],
                color: item.color,
                icon: item.icon ?? 'label',
            }));
        }
    },
    {
        id: NavigationItemId.Budget,
        type: 'link',
        labelKey: 'budgetBtn',
        icon: 'savings',
        svgIcon: 'budget',
        route: '/budget',
        exact: true
    },
    {
        id: NavigationItemId.Portfolio,
        type: 'link',
        labelKey: 'portfolioBtn',
        icon: 'show_chart',
        svgIcon: 'investment-growth',
        route: '/portfolio',
        exact: true
    },
    {
        id: NavigationItemId.Movements,
        type: 'link',
        labelKey: 'movementsBtn',
        icon: 'swap_horiz',
        svgIcon: 'movements',
        route: '/movements',
        exact: true
    }
];

export const FOOTER_MENU_ITEMS: NavigationItem[] = [
    {
        id: NavigationItemId.ManageCategories,
        type: 'link',
        labelKey: 'manageCategories',
        icon: 'category',
        svgIcon: 'manage-categories',
        route: '/categories/manage'
    },
    {
        id: NavigationItemId.Database,
        type: 'link',
        labelKey: 'databaseBtn',
        icon: 'database',
        svgIcon: 'database',
        route: '/database'
    },
    {
        id: NavigationItemId.Settings,
        type: 'expandable',
        labelKey: 'settingsBtn',
        icon: 'settings',
        svgIcon: 'settings',
        expandSignalKey: 'isSettingsExpanded'
    }
];
