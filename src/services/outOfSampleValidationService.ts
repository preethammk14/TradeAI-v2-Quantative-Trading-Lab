import { backtestingService } from './backtestingService';
import { MOCK_STOCKS, generateStockHistory } from '../data/mockStocks';
import { PricePoint } from '../types';

/**
 * Validation Suite for Locked Champion #5 (v1.5.0)
 * Evaluates In-Sample, OOS Test 1, OOS Test 2, and 3-Stage Walk-Forward Analysis.
 * Strategy logic is 100% read-only and uses the exact v1.5.0 parameters.
 */

export interface ValidationWindowResult {
  windowName: string;
  periodDescription: string;
  startDate: string;
  endDate: string;
  totalCandles: number;
  totalTrades: number;
  netPnl: number;
  returnPercent: number;
  profitFactor: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  brokeragePaid: number;
  regulatoryFeesPaid: number;
  totalFees: number;
  totalSlippage: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgHoldingDays: number;
  wins: number;
  losses: number;
  breakeven: number;
  benchmarkReturnPercent: number;
  benchmarkNetPnl: number;
  reconciliationDelta: number;
  perAsset: {
    symbol: string;
    trades: number;
    netPnl: number;
    returnPct: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    benchmarkReturnPct: number;
  }[];
}

export interface WalkForwardStageResult {
  stage: number;
  trainingWindow: ValidationWindowResult;
  testingWindow: ValidationWindowResult;
}

export interface CompleteValidationReport {
  inSample: ValidationWindowResult;
  oosTest1: ValidationWindowResult;
  oosTest2: ValidationWindowResult;
  walkForwardStages: WalkForwardStageResult[];
}

export function runLockedChampionValidation(): CompleteValidationReport {
  // Strategy params fixed at v1.5.0 values (NO parameter tuning)
  const defaultParams = {
    strategy: 'COMBINED_STRATEGY' as const,
    startingCapital: 100000,
    timeframe: '1Y' as const,
    fastPeriod: 20,
    slowPeriod: 50,
    rsiPeriod: 14,
    rsiOverbought: 70,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  };

  const evaluateDataSet = (
    windowName: string,
    periodDescription: string,
    historyProvider: (symbol: string, basePrice: number) => PricePoint[]
  ): ValidationWindowResult => {
    const allTrades: any[] = [];
    const perAsset: any[] = [];
    let benchmarkTotalStart = 0;
    let benchmarkTotalEnd = 0;
    let startDate = '';
    let endDate = '';

    MOCK_STOCKS.forEach((stock) => {
      const history = historyProvider(stock.symbol, stock.price);
      if (history.length < 50) return;

      if (!startDate) startDate = history[0].date;
      if (!endDate) endDate = history[history.length - 1].date;

      const firstClose = history[0].close;
      const lastClose = history[history.length - 1].close;
      const assetBenchReturnPct = Number((((lastClose - firstClose) / firstClose) * 100).toFixed(2));
      benchmarkTotalStart += 100000;
      benchmarkTotalEnd += 100000 * (1 + (lastClose - firstClose) / firstClose);

      const res = backtestingService.runBacktest(history, {
        ...defaultParams,
        symbol: stock.symbol,
      });

      perAsset.push({
        symbol: stock.symbol,
        trades: res.totalTrades,
        netPnl: res.totalReturn,
        returnPct: res.totalReturnPercent,
        winRate: res.winRate,
        profitFactor: res.profitFactor,
        maxDrawdown: res.maxDrawdown,
        benchmarkReturnPct: assetBenchReturnPct,
      });

      res.trades.forEach((t) => allTrades.push({ ...t, symbol: stock.symbol }));
    });

    const totalTrades = allTrades.length;
    const netPnl = Number(allTrades.reduce((acc, t) => acc + t.pnl, 0).toFixed(2));
    const grossWins = Number(allTrades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0).toFixed(2));
    const grossLosses = Number(Math.abs(allTrades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0)).toFixed(2));
    const grossProfit = Number(allTrades.filter((t) => t.grossPnl > 0).reduce((acc, t) => acc + t.grossPnl, 0).toFixed(2));
    const grossLoss = Number(Math.abs(allTrades.filter((t) => t.grossPnl < 0).reduce((acc, t) => acc + t.grossPnl, 0)).toFixed(2));
    const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 99.9 : 0;
    const brokeragePaid = Number(allTrades.reduce((acc, t) => acc + (t.brokeragePaid || 0), 0).toFixed(2));
    const regulatoryFeesPaid = Number(allTrades.reduce((acc, t) => acc + (t.regulatoryFeesPaid || 0), 0).toFixed(2));
    const totalFees = Number((brokeragePaid + regulatoryFeesPaid).toFixed(2));
    const totalSlippage = Number(allTrades.reduce((acc, t) => acc + (t.slippagePaid || 0), 0).toFixed(2));
    const wins = allTrades.filter((t) => t.status === 'WIN').length;
    const losses = allTrades.filter((t) => t.status === 'LOSS').length;
    const breakeven = allTrades.filter((t) => t.status === 'BREAKEVEN').length;
    const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
    const returnPercent = Number(((netPnl / 100000) * 100).toFixed(2));
    const totalHoldingDays = allTrades.reduce((acc, t) => acc + t.holdingDays, 0);
    const avgHoldingDays = totalTrades > 0 ? Number((totalHoldingDays / totalTrades).toFixed(1)) : 0;
    const maxDrawdown = perAsset.length > 0 ? Math.max(...perAsset.map((r) => r.maxDrawdown)) : 0;
    const maxDrawdownPercent = Number(((maxDrawdown / 100000) * 100).toFixed(2));

    const benchmarkReturnPercent = benchmarkTotalStart > 0
      ? Number((((benchmarkTotalEnd - benchmarkTotalStart) / benchmarkTotalStart) * 100).toFixed(2))
      : 0;
    const benchmarkNetPnl = Number((benchmarkTotalEnd - benchmarkTotalStart).toFixed(2));

    const computedNetPnl = Number((grossWins - grossLosses).toFixed(2));
    const reconciliationDelta = Number(Math.abs(netPnl - computedNetPnl).toFixed(2));

    return {
      windowName,
      periodDescription,
      startDate,
      endDate,
      totalCandles: historyProvider('AAPL', 200).length,
      totalTrades,
      netPnl,
      returnPercent,
      profitFactor,
      winRate,
      grossProfit,
      grossLoss,
      brokeragePaid,
      regulatoryFeesPaid,
      totalFees,
      totalSlippage,
      maxDrawdown,
      maxDrawdownPercent,
      avgHoldingDays,
      wins,
      losses,
      breakeven,
      benchmarkReturnPercent,
      benchmarkNetPnl,
      reconciliationDelta,
      perAsset,
    };
  };

  // 1. In-Sample Baseline (Training / Dev Period: standard 1-year baseline dataset ~180 trading days)
  const inSample = evaluateDataSet(
    'In-Sample (Dev Period)',
    '1-Year Baseline Training Window (Standard 8 Assets)',
    (symbol, basePrice) => generateStockHistory(symbol, basePrice, 0.02, 0.0005, 250)
  );

  // 2. OOS Test 1: Unseen 500-bar Horizon (2-Year multi-year dataset with independent seed drift)
  const oosTest1 = evaluateDataSet(
    'Out-of-Sample Test 1 (Unseen 500 Bars)',
    'Unseen 500-day historical horizon with distinct seed drift',
    (symbol, basePrice) => generateStockHistory(symbol + '_OOS1_TEST', basePrice, 0.022, 0.0003, 500)
  );

  // 3. OOS Test 2: Unseen Alternative Market Regime (350-bar dataset with higher volatility & drift)
  const oosTest2 = evaluateDataSet(
    'Out-of-Sample Test 2 (Unseen Regime)',
    'Unseen 350-day alternative volatility regime (vol=0.025, trend=0.0002)',
    (symbol, basePrice) => generateStockHistory(symbol + '_OOS2_REGIME', basePrice, 0.025, 0.0002, 350)
  );

  // 4. Walk-Forward 3-Stage Testing across a 750-bar continuous time series
  const full3YearHistory = (symbol: string, basePrice: number) =>
    generateStockHistory(symbol + '_WF_750', basePrice, 0.02, 0.0004, 750);

  // Stage 1: Train (Days 0-180), Test (Days 180-300 with 50-day warmup from day 130)
  const wfStage1Train = evaluateDataSet(
    'WF Stage 1 [TRAIN]',
    'Chronological Window: Days 0 - 180 (In-Sample Training)',
    (symbol, basePrice) => full3YearHistory(symbol, basePrice).slice(0, 180)
  );
  const wfStage1Test = evaluateDataSet(
    'WF Stage 1 [TEST - OOS]',
    'Chronological Window: Days 180 - 300 (Out-of-Sample Testing with Warmup)',
    (symbol, basePrice) => full3YearHistory(symbol, basePrice).slice(130, 300)
  );

  // Stage 2: Train (Days 120-300), Test (Days 300-420 with 50-day warmup from day 250)
  const wfStage2Train = evaluateDataSet(
    'WF Stage 2 [TRAIN]',
    'Chronological Window: Days 120 - 300 (In-Sample Training)',
    (symbol, basePrice) => full3YearHistory(symbol, basePrice).slice(120, 300)
  );
  const wfStage2Test = evaluateDataSet(
    'WF Stage 2 [TEST - OOS]',
    'Chronological Window: Days 300 - 420 (Out-of-Sample Testing with Warmup)',
    (symbol, basePrice) => full3YearHistory(symbol, basePrice).slice(250, 420)
  );

  // Stage 3: Train (Days 240-420), Test (Days 420-540 with 50-day warmup from day 370)
  const wfStage3Train = evaluateDataSet(
    'WF Stage 3 [TRAIN]',
    'Chronological Window: Days 240 - 420 (In-Sample Training)',
    (symbol, basePrice) => full3YearHistory(symbol, basePrice).slice(240, 420)
  );
  const wfStage3Test = evaluateDataSet(
    'WF Stage 3 [TEST - OOS]',
    'Chronological Window: Days 420 - 540 (Out-of-Sample Testing with Warmup)',
    (symbol, basePrice) => full3YearHistory(symbol, basePrice).slice(370, 540)
  );

  return {
    inSample,
    oosTest1,
    oosTest2,
    walkForwardStages: [
      { stage: 1, trainingWindow: wfStage1Train, testingWindow: wfStage1Test },
      { stage: 2, trainingWindow: wfStage2Train, testingWindow: wfStage2Test },
      { stage: 3, trainingWindow: wfStage3Train, testingWindow: wfStage3Test },
    ],
  };
}
