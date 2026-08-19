import { backtestingService } from './backtestingService';
import { generateStockHistory, MOCK_STOCKS } from '../data/mockStocks';
import { runLockedChampionValidation } from './outOfSampleValidationService';

export function runRobustnessInvestigation() {
  const oosHistory = (sym: string, p: number) => generateStockHistory(sym + '_OOS1_TEST', p, 0.022, 0.0003, 500);

  const baseParams = {
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

  const champ5Trades: any[] = [];
  const champ5PerAsset: any[] = [];
  const smaTrades: any[] = [];
  const smaPerAsset: any[] = [];

  let bnHStart = 0;
  let bnHEnd = 0;

  MOCK_STOCKS.forEach((stock) => {
    const history = oosHistory(stock.symbol, stock.price);
    const firstClose = history[0].close;
    const lastClose = history[history.length - 1].close;
    const bnHRet = ((lastClose - firstClose) / firstClose) * 100;
    bnHStart += 100000;
    bnHEnd += 100000 * (1 + (lastClose - firstClose) / firstClose);

    // Champion #5
    const res5 = backtestingService.runBacktest(history, {
      ...baseParams,
      strategy: 'COMBINED_STRATEGY',
      symbol: stock.symbol,
    });
    champ5PerAsset.push({
      symbol: stock.symbol,
      trades: res5.totalTrades,
      wins: res5.winningTrades,
      losses: res5.losingTrades,
      winRate: res5.winRate,
      netPnl: res5.totalReturn,
      returnPct: res5.totalReturnPercent,
      profitFactor: res5.profitFactor,
      maxDD: res5.maxDrawdown,
      bnHRet: bnHRet,
      grossProfit: res5.grossProfit,
      grossLoss: res5.grossLoss,
      fees: res5.trades.reduce((acc, t) => acc + (t.brokeragePaid + t.regulatoryFeesPaid), 0),
      slippage: res5.trades.reduce((acc, t) => acc + t.slippagePaid, 0),
      tradesList: res5.trades,
    });
    res5.trades.forEach((t) => champ5Trades.push({ ...t, symbol: stock.symbol }));

    // SMA 20/50 Crossover Baseline
    const resSMA = backtestingService.runBacktest(history, {
      ...baseParams,
      strategy: 'SMA_CROSSOVER',
      symbol: stock.symbol,
    });
    smaPerAsset.push({
      symbol: stock.symbol,
      trades: resSMA.totalTrades,
      netPnl: resSMA.totalReturn,
      returnPct: resSMA.totalReturnPercent,
      profitFactor: resSMA.profitFactor,
      maxDD: resSMA.maxDrawdown,
      winRate: resSMA.winRate,
    });
    resSMA.trades.forEach((t) => smaTrades.push({ ...t, symbol: stock.symbol }));
  });

  const totalOosNetPnl = champ5Trades.reduce((acc, t) => acc + t.pnl, 0);
  const totalSmaPnl = smaTrades.reduce((acc, t) => acc + t.pnl, 0);
  const smaGrossWins = smaTrades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const smaGrossLoss = Math.abs(smaTrades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const smaPF = smaGrossLoss > 0 ? Number((smaGrossWins / smaGrossLoss).toFixed(2)) : 99.9;
  const smaMaxDD = Math.max(...smaPerAsset.map((a) => a.maxDD));
  const bnHReturnOverall = ((bnHEnd - bnHStart) / bnHStart) * 100;

  // Concentration analysis
  const sortedGains = [...champ5Trades].map((t) => t.pnl).sort((a, b) => b - a);
  const top1TradePnl = sortedGains[0] || 0;
  const top2TradesPnl = (sortedGains[0] || 0) + (sortedGains[1] || 0);
  const top3TradesPnl = (sortedGains[0] || 0) + (sortedGains[1] || 0) + (sortedGains[2] || 0);

  // Asset gains
  const assetGains = [...champ5PerAsset]
    .map((a) => ({ symbol: a.symbol, netPnl: a.netPnl }))
    .sort((a, b) => b.netPnl - a.netPnl);

  return {
    champ5Trades,
    champ5PerAsset,
    smaTrades,
    smaPerAsset,
    totalOosNetPnl,
    totalSmaPnl,
    smaPF,
    smaMaxDD,
    bnHReturnOverall,
    top1TradePnl,
    top2TradesPnl,
    top3TradesPnl,
    assetGains,
  };
}
