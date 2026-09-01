import { Transaction } from './transaction';
import { RecordListSchema } from './record-list-schema';

export const TRANSACTION_LIST_SCHEMA: RecordListSchema<Transaction> = {
  idAccessor: t => t.id,
  columns: [
    { key: 'icon', dataType: 'icon', labelKey: 'thCategory', primary: true, accessor: t => t.category },
    { key: 'description', dataType: 'text', labelKey: 'thDescription', primary: true, searchable: true, accessor: t => t.description },
    { key: 'category', dataType: 'category', labelKey: 'thCategory', primary: true, searchable: true, accessor: t => t.category },
    { key: 'date', dataType: 'date', labelKey: 'thDate', primary: true, accessor: t => t.date },
    { key: 'amount', dataType: 'currency', labelKey: 'thAmount', primary: true, accessor: t => t.amount },
    { key: 'balance', dataType: 'currency', labelKey: 'movementsHeaderBalance', primary: false, accessor: t => t.balance },
    { key: 'account', dataType: 'mutedCaption', labelKey: 'movementsHeaderAccount', primary: false, accessor: t => t.account },
    { key: 'budget', dataType: 'mutedCaption', labelKey: 'movementsHeaderBudgets', primary: false, accessor: t => t.budgetId },
    { key: 'tags', dataType: 'mutedCaption', labelKey: 'movementsHeaderTags', primary: false, searchable: true, accessor: t => t.tags?.join(', ') }
  ]
};
