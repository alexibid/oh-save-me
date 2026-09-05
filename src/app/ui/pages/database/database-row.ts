export interface DatabaseRow {
  [field: string]: unknown;
  id?: string;
  name?: string;
  type?: string;
  amount?: number;
  categoryId?: string;
  tags?: readonly string[];
  startDate?: string;
  endDate?: string;
  monthlyAllocation?: number;
  isClosed?: boolean;
  isCustom?: boolean;
  color?: string;
  icon?: string;
  key?: string;
  value?: string;
  date?: string;
  description?: string;
  category?: string;
  account?: string;
}
