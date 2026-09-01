import { Injectable, computed, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { PerformanceMonitorService } from '@application/services/performance-monitor.service';
import { BudgetSelectors } from './budget.selectors';
import {
  Budget,
  WalletKind,
  isLoanBackedKind,
  walletAppreciatedEstimate,
  walletPaidAmount,
  walletValuationGain,
  walletValue
} from '@domain/models/budget';
import { MonthlyBalancePoint, buildAssetBalanceHistory } from '@domain/shared/asset-balance-history.utils';
import {
  InvestmentPosition,
  PositionStatus,
  buildInvestmentPositions,
  investedValue,
  realizedResult
} from '@domain/shared/investment-positions.utils';

export type WalletSource = 'statement' | 'manual';

export interface WalletEntry {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly kind?: WalletKind;
  readonly source: WalletSource;
  readonly status: PositionStatus;
  readonly shares: number;
  readonly investedCost: number;
  readonly currentValue: number;
  readonly result: number;
  readonly income: number;
  readonly referenceDate: string;
  readonly paidInstalments?: number;
  readonly contractedInstalments?: number;
  readonly outstandingDebt?: number;
  readonly appreciationPercent?: number;
  readonly appreciatedEstimate?: number;
  readonly targetAmount?: number;
  readonly targetDate?: string;
  readonly targetProfitPct?: number;
  readonly targetPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioSelectors {
  private readonly store = useStore();
  private readonly budgets = inject(BudgetSelectors);
  private readonly performanceMonitor = inject(PerformanceMonitorService);

  readonly positions = computed<readonly InvestmentPosition[]>(() =>
    this.performanceMonitor.measureSync('PortfolioSelectors.positions', () =>
      buildInvestmentPositions(this.store.transactions())
    )
  );

  readonly assetBalanceHistory = computed<readonly MonthlyBalancePoint[]>(() =>
    this.performanceMonitor.measureSync('PortfolioSelectors.assetBalanceHistory', () =>
      buildAssetBalanceHistory(this.store.transactions())
    )
  );

  readonly manualWallets = computed<readonly Budget[]>(() =>
    this.store.budgets().filter(budget => budget.type === 'investment' && !budget.isClosed)
  );

  readonly wallets = computed<readonly WalletEntry[]>(() =>
    this.positions().map(toStatementEntry)
  );

  readonly assetWallets = computed<readonly WalletEntry[]>(() =>
    this.manualWallets().map(toManualEntry)
  );

  readonly heldWallets = computed<readonly WalletEntry[]>(() =>
    this.wallets().filter(entry => entry.status === 'open')
  );

  readonly executedWallets = computed<readonly WalletEntry[]>(() =>
    this.wallets().filter(entry => entry.status === 'executed')
  );

  readonly financialWallets = computed<readonly Budget[]>(() =>
    this.manualWallets().filter(wallet => !isLoanBackedKind(wallet.kind))
  );

  readonly propertyWallets = computed<readonly Budget[]>(() =>
    this.manualWallets().filter(wallet => isLoanBackedKind(wallet.kind))
  );

  readonly investedValue = computed<number>(() =>
    round(investedValue(this.positions()) + sumValue(this.financialWallets()))
  );

  readonly assetsValue = computed<number>(() => sumValue(this.propertyWallets()));

  readonly realizedResult = computed<number>(() => realizedResult(this.positions()));

  readonly receivedIncome = computed<number>(() =>
    round(this.positions().reduce((sum, position) => sum + position.income, 0) + this.realizedResult())
  );

  readonly firstIncomeDate = computed<string | null>(() => {
    const dates = this.store.transactions()
      .filter(isReturnMovement)
      .map(transaction => transaction.date)
      .filter(Boolean)
      .sort();
    return dates[0] ?? null;
  });

  readonly brokerCash = computed<number>(() => this.budgets.investmentBalance());

  readonly accessibleValue = computed<number>(() =>
    round(this.budgets.freeBalance() + this.brokerCash())
  );

  readonly reservedValue = computed<number>(() =>
    round(this.budgets.walletBalance() - this.budgets.freeBalance())
  );

  readonly lockedValue = computed<number>(() => round(this.investedValue() + this.assetsValue()));

  readonly paidInstalments = computed<number>(() => {
    const wallets = this.propertyWallets();
    const seeded = wallets.reduce((sum, wallet) => sum + (wallet.paidInstalments ?? 0), 0);
    const observed = this.observedInstalmentMonths(wallets);
    return Math.max(seeded, observed);
  });

  readonly contractedInstalments = computed<number>(() =>
    this.propertyWallets().reduce((sum, wallet) => sum + (wallet.contractedInstalments ?? 0), 0)
  );

  private observedInstalmentMonths(wallets: readonly Budget[]): number {
    const walletIds = new Set(wallets.map(wallet => wallet.id));
    const months = new Set<string>();

    for (const transaction of this.store.transactions()) {
      if (transaction.amount >= 0 || !transaction.budgetId) continue;
      if (!walletIds.has(transaction.budgetId) || !transaction.date) continue;
      months.add(transaction.date.slice(0, 7));
    }

    return months.size;
  }

  readonly outstandingDebt = computed<number>(() =>
    round(this.propertyWallets().reduce((sum, wallet) => sum + (wallet.outstandingDebt ?? 0), 0))
  );

  readonly totalPatrimony = computed<number>(() =>
    round(this.accessibleValue() + this.reservedValue() + this.lockedValue())
  );
}

function toStatementEntry(position: InvestmentPosition): WalletEntry {
  const isExecuted = position.status === 'executed';
  return {
    id: `position-${position.symbol}`,
    name: position.assetName,
    subtitle: position.symbol,
    source: 'statement',
    status: position.status,
    shares: position.shares,
    investedCost: isExecuted ? position.totalBought : position.investedCost,
    currentValue: isExecuted ? position.totalSold : position.investedCost,
    result: position.realizedGain,
    income: position.income,
    referenceDate: position.lastMovementDate
  };
}

function toManualEntry(wallet: Budget): WalletEntry {
  return {
    id: wallet.id,
    name: wallet.name,
    subtitle: '',
    kind: wallet.kind as WalletKind | undefined,
    source: 'manual',
    status: 'open',
    shares: 0,
    investedCost: walletPaidAmount(wallet),
    currentValue: walletValue(wallet),
    result: walletValuationGain(wallet),
    income: 0,
    referenceDate: wallet.startDate ?? '',
    paidInstalments: wallet.paidInstalments,
    contractedInstalments: wallet.contractedInstalments,
    outstandingDebt: wallet.outstandingDebt,
    appreciationPercent: wallet.appreciationPercent,
    appreciatedEstimate: walletAppreciatedEstimate(wallet),
    targetAmount: wallet.targetAmount,
    targetDate: wallet.targetDate,
    targetProfitPct: wallet.targetProfitPct,
    targetPrice: wallet.targetPrice
  };
}

function isReturnMovement(transaction: { readonly investmentType?: string }): boolean {
  return transaction.investmentType === 'sell'
    || transaction.investmentType === 'dividend'
    || transaction.investmentType === 'interest';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumValue(wallets: readonly Budget[]): number {
  return round(wallets.reduce((sum, wallet) => sum + walletValue(wallet), 0));
}
