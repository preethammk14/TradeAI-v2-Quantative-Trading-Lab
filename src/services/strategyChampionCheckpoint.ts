/**
 * CHECKPOINT: Improvement #5 (Fast-SMA Slope Confirmation Filter)
 * Status: OFFICIAL CHAMPION (Locked & Verified)
 *
 * Performance Summary:
 * - 8 Assets, 1-Year Backtest, ₹100,000 Capital
 * - Total Trades: 22
 * - Net P&L: +₹16,078.89 (+16.08%)
 * - Profit Factor: 2.60
 * - Win Rate: 36.36% (8 Wins, 14 Losses, 0 Breakeven)
 * - Maximum Drawdown: ₹3,631.98 (3.48%)
 * - Total Fees: ₹3,080.77 (Brokerage: ₹880, Regulatory: ₹2,200.77)
 * - Total Slippage: ₹2,186.48
 * - Total Friction: ₹5,267.25
 * - Accounting Reconciliation Delta: 0.00
 * - Look-ahead Bias: Zero (Causal Wilder/SMA/MACD with strictly index i and i-1)
 */

export interface StrategyChampionRecord {
  version: string;
  name: string;
  dateLocked: string;
  metrics: {
    totalTrades: number;
    netPnl: number;
    finalEquity: number;
    returnPercent: number;
    profitFactor: number;
    winRate: number;
    grossProfit: number;
    grossLoss: number;
    totalFees: number;
    totalSlippage: number;
    maxDrawdown: number;
    avgHoldingDays: number;
    reconciliationDelta: number;
  };
  rules: {
    entry: string;
    exit: string;
    indicators: string;
  };
}

export const CHAMPION_IMPROVEMENT_5: StrategyChampionRecord = {
  version: '1.5.0',
  name: 'Improvement #5 — Fast-SMA Slope Confirmation Filter',
  dateLocked: '2026-08-15',
  metrics: {
    totalTrades: 22,
    netPnl: 16078.89,
    finalEquity: 116078.89,
    returnPercent: 16.08,
    profitFactor: 2.60,
    winRate: 36.36,
    grossProfit: 27276.02,
    grossLoss: 8116.36,
    totalFees: 3080.77,
    totalSlippage: 2186.48,
    maxDrawdown: 3631.98,
    avgHoldingDays: 9.2,
    reconciliationDelta: 0.00,
  },
  rules: {
    entry: 'currFast > currSlow && isFastSmaRising && currRsi < 55 && currMacdHist > 0',
    exit: 'currFast < currSlow || currMacdHist < 0',
    indicators: 'SMA(20), SMA(50), RSI(14), MACD(12, 26, 9)',
  },
};
