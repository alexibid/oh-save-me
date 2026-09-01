import { AccountType } from '@domain/models/account';

export interface MappingTemplate {
  id: string;
  name: string;
  accountType?: AccountType;
  dateCol: string;
  descCol: string;
  amountCol?: string;
  debitCol?: string;
  creditCol?: string;
  balanceCol?: string;
  availableBalanceCol?: string;
  sharesCol?: string;
  priceCol?: string;
  feeCol?: string;
  taxCol?: string;
  symbolCol?: string;
  typeCol?: string;
  assetNameCol?: string;
  assetTypeCol?: string;
  delimiter?: string;
  headerIdx?: number;
}

export const ACCOUNT_TYPE_REQUIRED_FIELDS: Record<AccountType, string[]> = {
  bank_account: ['date', 'desc', 'amount', 'credit'],
  credit_card: ['date', 'desc', 'amount'],
  meal_card: ['date', 'desc', 'amount'],
  investment: ['date', 'desc', 'amount', 'investmentType']
};

export const DEFAULT_TEMPLATES: MappingTemplate[] = [
  {
    id: 'cgd',
    name: 'CGD Extrato Normal',
    accountType: 'bank_account',
    dateCol: 'data mov',
    descCol: 'descri',
    debitCol: 'debi',
    creditCol: 'credi',
    balanceCol: 'saldo cont',
    availableBalanceCol: 'saldo dispon',
    delimiter: ';',
    headerIdx: 0
  },
  {
    id: 'universo',
    name: 'Cartão Universo / Universo',
    accountType: 'credit_card',
    dateCol: 'data',
    descCol: 'movimento',
    amountCol: 'montante',
    delimiter: ',',
    headerIdx: 0
  },
  {
    id: 'refeicao_template',
    name: 'Cartão Refeição Padrão',
    accountType: 'meal_card',
    dateCol: 'data',
    descCol: 'descricao',
    debitCol: 'debito',
    creditCol: 'credito',
    delimiter: ';',
    headerIdx: 0
  },
  {
    id: 'caixa_classic',
    name: 'Caixa Classic',
    accountType: 'credit_card',
    dateCol: 'data',
    descCol: 'descricao',
    debitCol: 'debito',
    creditCol: 'credito',
    delimiter: ';',
    headerIdx: 0
  },
  {
    id: 'trade_republic',
    name: 'Trade Republic Investimentos',
    accountType: 'investment',
    dateCol: 'date',
    descCol: 'description',
    amountCol: 'amount',
    sharesCol: 'shares',
    priceCol: 'price',
    feeCol: 'fee',
    taxCol: 'tax',
    symbolCol: 'symbol',
    typeCol: 'type',
    assetNameCol: 'name',
    assetTypeCol: 'asset_class',
    delimiter: ',',
    headerIdx: 0
  }
];
