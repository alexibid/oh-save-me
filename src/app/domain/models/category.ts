import { AccountType } from './account';

export type CategoryType = string;

export interface CategoryInfo {
  readonly id: CategoryType;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly enabled?: boolean;
  readonly accountTypes?: readonly AccountType[];
}

export interface CategoryItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly percentage: number;
  readonly color: string;
}

export const TEMPLATE_CATEGORIES: CategoryInfo[] = [
  { id: 'Housing', name: 'Housing & DIY', icon: 'category-housing', color: '#3b82f6' },
  { id: 'Utilities', name: 'Utilities & Services', icon: 'category-bolt', color: '#0ea5e9' },
  { id: 'Groceries', name: 'Groceries & Supermarket', icon: 'category-groceries', color: '#10b981' },
  { id: 'Restaurants', name: 'Restaurants & Dining', icon: 'category-restaurant', color: '#059669' },
  { id: 'Transportation', name: 'Transportation & Tolls', icon: 'category-transport', color: '#6366f1' },
  { id: 'Entertainment', name: 'Entertainment & Leisure', icon: 'category-entertainment', color: '#ef4444' },
  { id: 'Education', name: 'Education & Books', icon: 'category-education', color: '#f59e0b' },
  { id: 'Healthcare', name: 'Healthcare & Wellness', icon: 'category-healthcare', color: '#ec4899' },
  { id: 'Clothing', name: 'Clothing & Fashion', icon: 'category-clothing', color: '#8b5cf6' },
  { id: 'Technology', name: 'Technology & Gadgets', icon: 'category-technology', color: '#06b6d4' },
  { id: 'Pets', name: 'Pets & Veterinary', icon: 'category-pets', color: '#14b8a6' },
  { id: 'Travel', name: 'Travel & Vacations', icon: 'category-travel', color: '#f43f5e' },
  { id: 'Gifts', name: 'Gifts & Donations', icon: 'category-gifts', color: '#a855f7' },
  { id: 'Taxes', name: 'Taxes, Fees & Duties', icon: 'category-taxes', color: '#6b7280', accountTypes: ['investment'] },
  { id: 'Investments', name: 'Investments & Savings', icon: 'category-investments', color: '#4f46e5', accountTypes: ['investment'] },
  { id: 'Income', name: 'Salary & Income', icon: 'category-income', color: '#22c55e' },
  { id: 'General', name: 'General Expenses', icon: 'category-general', color: '#94a3b8' },
  { id: 'Credit', name: 'Credit Cards', icon: 'category-credit', color: '#84cc16' },
  { id: 'Online', name: 'Online Shopping', icon: 'category-online', color: '#f59e0b' },
  { id: 'Transfers', name: 'Transfers & P2P', icon: 'category-transfers', color: '#a855f7', accountTypes: ['investment'] },
  { id: 'Kids', name: 'Kids & Family', icon: 'category-kids', color: '#db2777' },
  { id: 'Others', name: 'Others / Miscellaneous', icon: 'category-others', color: '#cbd5e1', accountTypes: ['investment'] },
  { id: 'AssetSale', name: 'Asset Sale', icon: 'category-sale', color: '#0891b2', accountTypes: ['investment'] },
  { id: 'Dividends', name: 'Dividends', icon: 'category-dividends', color: '#16a34a', accountTypes: ['investment'] },
  { id: 'Interest', name: 'Interest', icon: 'category-interest', color: '#ca8a04', accountTypes: ['investment'] },
  { id: 'Fees', name: 'Fees & Commissions', icon: 'category-fees', color: '#dc2626', accountTypes: ['investment'] },
];

