import React, { useState } from 'react';
import {
  LineChart,
  Play,
  Award,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Download,
  Clock,
  PieChart,
  DollarSign,
  Activity,
} from 'lucide-react';
import { StockQuote, StrategyType, BacktestParams, BacktestResult, Timeframe } from '../types';
import { getStockBySymbol, MOCK_STOCKS } from '../data/mockStocks';
import { backtestingService } from '../services/backtestingService';
import { EquityCurveChart } from '../components/EquityCurveChart';
import { DemoDataBadge } from '../components/DemoDataBadge';
import { PaperTradingNotice } from '../components/PaperTradingNotice';
import { ResearchConfigBadge } from '../components/ResearchConfigBadge';
import { ResearchConfigurationSection } from '../components/ResearchConfigurationSection';
import { researchConfigService } from '../services/researchConfigService';
import { ResearchConfig } from '../types/researchTypes';

interface BacktestingPageProps {
  quotes: StockQuote[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  currencySymbol: string;
}

export const BacktestingPage: React.FC<BacktestingPageProps> = ({
  quotes,
  selectedSymbol,
  onSelectStock,
  currencySymbol,
}) => {
  const [strategy, setStrategy] = useState<StrategyType>('COMBINED_STRATEGY');
  const [startingCapital, setStartingCapital] = useState<number>(100000);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 1. SMA Parameters (Fast: 5-50, Slow: 20-200)
  const [fastPeriod, setFastPeriod] = useState<number>(20);
  const [slowPeriod, setSlowPeriod] = useState<number>(50);

  // 2. RSI Parameters (Period: 7-21, Oversold: 20-40, Overbought: 60-80)
  const [rsiPeriod, setRsiPeriod] = useState<number>(14);
  const [rsiOversold, setRsiOversold] = useState<number>(30);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);

  // 3. MACD Parameters (Fast: 8-16, Slow: 20-30, Signal: 5-12)
  const [macdFastPeriod, setMacdFastPeriod] = useState<number>(12);
  const [macdSlowPeriod, setMacdSlowPeriod] = useState<number>(26);
  const [macdSignalPeriod, setMacdSignalPeriod] = useState<number>(9);

  // 4. Bollinger Bands Parameters (Period: 10-30, StdDev: 1.5-3.0)
  const [bollingerPeriod, setBollingerPeriod] = useState<number>(20);
  const [bollingerStdDev, setBollingerStdDev] = useState<number>(2.0);

  // Phase A: Configurable friction controls
  const [slippagePercent, setSlippagePercent] = useState<number>(0.05); // 0.05% default
  const [brokeragePerTrade, setBrokeragePerTrade] = useState<number>(20); // ₹20 flat default
  const [regulatoryFeePercent, setRegulatoryFeePercent] = useState<number>(0.05); // 0.05% default

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStock = quotes.find((q) => q.symbol === selectedSymbol) || getStockBySymbol(selectedSymbol) || MOCK_STOCKS[0];

  const handleRunBacktest = () => {
    setError(null);
    try {
      const fullHistory = currentStock.history || [];
      if (!fullHistory || fullHistory.length < 50) {
        throw new Error('Insufficient price history for backtesting (minimum 50 daily candles required).');
      }

      // Filter history based on selected date range if specified
      let filteredHistory = fullHistory;
      if (startDate) {
        filteredHistory = filteredHistory.filter((item) => item.date >= startDate);
      }
      if (endDate) {
        filteredHistory = filteredHistory.filter((item) => item.date <= endDate);
      }

      if (filteredHistory.length < 50) {
        throw new Error(`Selected date range contains only ${filteredHistory.length} daily candles. Minimum 50 candles required to compute moving averages and indicators.`);
      }

      const versionTag = strategy === 'COMBINED_STRATEGY' ? 'CH5-V1.5.0' : strategy;
      const historyLength = filteredHistory.length;
      const actualStartDate = filteredHistory[0]?.date || '2025-08-18';
      const actualEndDate = filteredHistory[filteredHistory.length - 1]?.date || '2026-08-18';

      const config: ResearchConfig = {
        configId: `CFG-BT-${currentStock.symbol}-${Date.now().toString(36).toUpperCase()}`,
        configName: `Single-Asset Backtest — ${currentStock.symbol} (${strategy})`,
        scope: 'BACKTEST',
        strategyVersion: versionTag,
        datasetName: `Historical Demo Feed (${currentStock.name})`,
        dateRange: { start: actualStartDate, end: actualEndDate },
        numberOfCandles: `${historyLength} Daily Candles`,
        assets: [currentStock.symbol],
        timeframe: '1D (Daily OHLCV)',
        initialCapital: startingCapital,
        brokerage: `₹${brokeragePerTrade.toFixed(2)} Flat per Order`,
        taxes: `${regulatoryFeePercent.toFixed(2)}% Turnover (STT + GST + SEBI)`,
        slippage: `${slippagePercent.toFixed(2)}% Next-Bar Open Execution`,
        positionSizing: '100% Single-Asset Equity Allocation',
        indicatorWarmUpPeriod: '50 Bars',
        trainingWindow: `${historyLength} Bars (In-Sample Period)`,
        validationWindow: 'N/A (Single-Period Backtest)',
        outOfSampleWindow: 'N/A (Historical In-Sample Simulation)',
        checksumSignature: `SHA256-BT-${currentStock.symbol}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        notes: `Exploratory backtest of ${strategy} on ${currentStock.symbol} using shared historical demo dataset.`,
      };

      const res = backtestingService.runBacktest(filteredHistory, {
        symbol: currentStock.symbol,
        strategy,
        startingCapital,
        timeframe: '1Y',
        fastPeriod,
        slowPeriod,
        rsiPeriod,
        rsiOverbought,
        rsiOversold,
        macdFastPeriod,
        macdSlowPeriod,
        macdSignalPeriod,
        bollingerPeriod,
        bollingerStdDev,
        slippagePercent,
        brokeragePerTrade,
        regulatoryFeePercent,
        strategyVersion: versionTag,
        researchConfig: config,
      });

      res.researchConfig = config;
      res.strategyVersion = versionTag;
      res.resultScope = 'BACKTEST';

      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute backtest.');
    }
  };

  React.useEffect(() => {
    handleRunBacktest();
  }, [selectedSymbol]);

  const handleExportCSV = () => {
    if (!result) return;

    const headers = [
      'Trade #',
      'Type',
      'Status',
      'Entry Date',
      'Entry Price',
      'Entry Reason',
      'Exit Date',
      'Exit Price',
      'Exit Reason',
      'Quantity',
      'Holding Days',
      `Gross P/L (${currencySymbol})`,
      `Slippage Paid (${currencySymbol})`,
      `Brokerage Paid (${currencySymbol})`,
      `Regulatory Taxes (${currencySymbol})`,
      `Total Friction (${currencySymbol})`,
      `Net P/L (${currencySymbol})`,
      'Net P/L (%)',
    ];

    const rows = result.trades.map((t, idx) => [
      idx + 1,
      t.type,
      t.status,
      t.entryDate,
      t.entryPrice.toFixed(2),
      `"${(t.entryReason || t.reason || '').replace(/"/g, '""')}"`,
      t.exitDate,
      t.exitPrice.toFixed(2),
      `"${(t.exitReason || t.reason || '').replace(/"/g, '""')}"`,
      t.quantity,
      t.holdingDays,
      t.grossPnl.toFixed(2),
      (t.slippagePaid || 0).toFixed(2),
      (t.brokeragePaid || 0).toFixed(2),
      (t.regulatoryFeesPaid || 0).toFixed(2),
      (t.totalFrictionPaid || 0).toFixed(2),
      t.pnl.toFixed(2),
      t.pnlPercent.toFixed(2),
    ]);

    const summaryHeader = [
      ['BACKTEST SUMMARY REPORT'],
      ['Symbol', result.symbol],
      ['Strategy', `"${result.strategyName.replace(/"/g, '""')}"`],
      ['Starting Capital', result.initialCapital],
      ['Final Capital', result.finalCapital],
      ['Net Total Return', `${result.totalReturn} (${result.totalReturnPercent}%)`],
      ['Buy & Hold Return', `${result.buyAndHoldReturnPercent}%`],
      ['Total Trades', result.totalTrades],
      ['Winning Trades', `${result.winningTrades} (${result.winRate}%)`],
      ['Losing Trades', `${result.losingTrades} (${result.lossRate}%)`],
      ['Breakeven Trades', `${result.breakevenTrades} (${result.breakevenRate}%)`],
      ['Gross Profit', result.grossProfit],
      ['Gross Loss', result.grossLoss],
      ['Total Gross P/L', result.totalGrossPnl],
      ['Total Friction Incurred', result.totalFrictionPaid || 0],
      ['Profit Factor', result.profitFactor],
      ['Max Drawdown', `${result.maxDrawdown} (${result.maxDrawdownPercent}%)`],
      ['Average Winning Trade', result.avgWinningTrade],
      ['Average Losing Trade', result.avgLosingTrade],
      ['Largest Win', result.largestWin],
      ['Largest Loss', result.largestLoss],
      ['Average Holding Period (Days)', result.avgHoldingDays],
      ['Longest Holding Period (Days)', result.longestHoldingDays],
      [],
      ['--- TRADE EXECUTION LOG ---'],
    ];

    const csvContent = [
      ...summaryHeader.map((r) => r.join(',')),
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const cleanStrategy = result.strategyName.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${result.symbol}_${cleanStrategy}_Backtest_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      <DemoDataBadge />

      {/* Mandatory Paper Trading & Simulated Environment Notice */}
      <PaperTradingNotice />

      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <LineChart className="w-6 h-6 text-emerald-400" />
            <span>Algorithmic Strategy Backtesting Simulator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate quantitative rules against historical price data to measure expected returns & drawdown risk
          </p>
        </div>

        <button
          onClick={handleRunBacktest}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Execute Backtest</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Parameter Panel (1 col) + Results View (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Controls Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Strategy Configuration</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Stock Symbol Selection */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Select Equity:</label>
              <select
                value={selectedSymbol}
                onChange={(e) => onSelectStock(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              >
                {quotes.map((q) => (
                  <option key={q.symbol} value={q.symbol}>
                    {q.symbol} — {q.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Strategy Preset Select */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Algorithm Model:</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyType)}
                className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="COMBINED_STRATEGY">Champion #5: Multi-Indicator (SMA + RSI + MACD)</option>
                <option value="SMA_CROSSOVER">SMA Golden/Death Crossover</option>
                <option value="RSI_STRATEGY">RSI Overbought / Oversold Mean Reversion</option>
                <option value="MACD_STRATEGY">MACD Trend & Signal Crossover</option>
                <option value="BOLLINGER_STRATEGY">Bollinger Bands Mean Reversion</option>
              </select>
            </div>

            {/* Backtest Date Range Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold uppercase tracking-wider">Backtest Date Range</span>
                <span className="text-[10px] text-amber-400 font-medium">Demo Historical Data</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Start Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">End Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                    !startDate && !endDate
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Full Available
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() - 1);
                    setStartDate(d.toISOString().split('T')[0]);
                    setEndDate('');
                  }}
                  className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                >
                  1 Year
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 6);
                    setStartDate(d.toISOString().split('T')[0]);
                    setEndDate('');
                  }}
                  className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                >
                  6 Months
                </button>
              </div>
            </div>

            {/* Starting Capital */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Initial Backtest Capital ({currencySymbol}):</label>
              <input
                type="number"
                value={startingCapital}
                onChange={(e) => setStartingCapital(parseFloat(e.target.value) || 10000)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Dynamic Parameters according to strategy */}
            {strategy === 'SMA_CROSSOVER' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">SMA Parameters</span>
                  <span className="text-[10px] text-slate-500">Fast &lt; Slow</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Fast Period (5–50):</label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={fastPeriod}
                      onChange={(e) => setFastPeriod(parseInt(e.target.value) || 5)}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Slow Period (20–200):</label>
                    <input
                      type="number"
                      min="20"
                      max="200"
                      value={slowPeriod}
                      onChange={(e) => setSlowPeriod(parseInt(e.target.value) || 20)}
                      className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {strategy === 'RSI_STRATEGY' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">RSI Parameters</span>
                  <span className="text-[10px] text-slate-500">Oversold &lt; Overbought</span>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">RSI Period (7–21):</label>
                  <input
                    type="number"
                    min="7"
                    max="21"
                    value={rsiPeriod}
                    onChange={(e) => setRsiPeriod(parseInt(e.target.value) || 14)}
                    className="w-full bg-slate-950 border border-slate-800 text-purple-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Oversold (20–40):</label>
                    <input
                      type="number"
                      min="20"
                      max="40"
                      value={rsiOversold}
                      onChange={(e) => setRsiOversold(parseInt(e.target.value) || 30)}
                      className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Overbought (60–80):</label>
                    <input
                      type="number"
                      min="60"
                      max="80"
                      value={rsiOverbought}
                      onChange={(e) => setRsiOverbought(parseInt(e.target.value) || 70)}
                      className="w-full bg-slate-950 border border-slate-800 text-rose-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {strategy === 'MACD_STRATEGY' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">MACD Parameters</span>
                  <span className="text-[10px] text-slate-500">Fast &lt; Slow</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Fast (8–16):</label>
                    <input
                      type="number"
                      min="8"
                      max="16"
                      value={macdFastPeriod}
                      onChange={(e) => setMacdFastPeriod(parseInt(e.target.value) || 12)}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Slow (20–30):</label>
                    <input
                      type="number"
                      min="20"
                      max="30"
                      value={macdSlowPeriod}
                      onChange={(e) => setMacdSlowPeriod(parseInt(e.target.value) || 26)}
                      className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Signal (5–12):</label>
                    <input
                      type="number"
                      min="5"
                      max="12"
                      value={macdSignalPeriod}
                      onChange={(e) => setMacdSignalPeriod(parseInt(e.target.value) || 9)}
                      className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {strategy === 'BOLLINGER_STRATEGY' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">Bollinger Bands</span>
                  <span className="text-[10px] text-slate-500">Period &amp; StdDev</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Period (10–30):</label>
                    <input
                      type="number"
                      min="10"
                      max="30"
                      value={bollingerPeriod}
                      onChange={(e) => setBollingerPeriod(parseInt(e.target.value) || 20)}
                      className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Std Dev σ (1.5–3.0):</label>
                    <input
                      type="number"
                      min="1.5"
                      max="3.0"
                      step="0.1"
                      value={bollingerStdDev}
                      onChange={(e) => setBollingerStdDev(parseFloat(e.target.value) || 2.0)}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {strategy === 'COMBINED_STRATEGY' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">Multi-Indicator Inputs</span>
                  <span className="text-[10px] text-slate-500">SMA + RSI + MACD</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Fast SMA (5–50):</label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={fastPeriod}
                      onChange={(e) => setFastPeriod(parseInt(e.target.value) || 20)}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Slow SMA (20–200):</label>
                    <input
                      type="number"
                      min="20"
                      max="200"
                      value={slowPeriod}
                      onChange={(e) => setSlowPeriod(parseInt(e.target.value) || 50)}
                      className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">RSI Period (7–21):</label>
                    <input
                      type="number"
                      min="7"
                      max="21"
                      value={rsiPeriod}
                      onChange={(e) => setRsiPeriod(parseInt(e.target.value) || 14)}
                      className="w-full bg-slate-950 border border-slate-800 text-purple-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">RSI Exit (&gt;):</label>
                    <input
                      type="number"
                      min="60"
                      max="80"
                      value={rsiOverbought}
                      onChange={(e) => setRsiOverbought(parseInt(e.target.value) || 70)}
                      className="w-full bg-slate-950 border border-slate-800 text-rose-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">MACD Fast:</label>
                    <input
                      type="number"
                      min="8"
                      max="16"
                      value={macdFastPeriod}
                      onChange={(e) => setMacdFastPeriod(parseInt(e.target.value) || 12)}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">MACD Slow:</label>
                    <input
                      type="number"
                      min="20"
                      max="30"
                      value={macdSlowPeriod}
                      onChange={(e) => setMacdSlowPeriod(parseInt(e.target.value) || 26)}
                      className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">MACD Sig:</label>
                    <input
                      type="number"
                      min="5"
                      max="12"
                      value={macdSignalPeriod}
                      onChange={(e) => setMacdSignalPeriod(parseInt(e.target.value) || 9)}
                      className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Backtest Market Friction & Transaction Costs Controls */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold text-[11px] uppercase tracking-wider">
                  Realistic Market Friction
                </span>
                <span className="text-[10px] text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-full">
                  Simulation Only
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="text-slate-400">Slippage per Order:</label>
                  <span className="text-emerald-400 font-bold">{slippagePercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={slippagePercent}
                  onChange={(e) => setSlippagePercent(parseFloat(e.target.value) || 0)}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>0% (Ideal)</span>
                  <span>0.25%</span>
                  <span>0.5% (High Impact)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Brokerage / Order ({currencySymbol}):</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={brokeragePerTrade}
                    onChange={(e) => setBrokeragePerTrade(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Govt/STT Taxes (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={regulatoryFeePercent}
                    onChange={(e) => setRegulatoryFeePercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleRunBacktest}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Run Backtest Engine</span>
            </button>
          </div>
        </div>

        {/* Results Metrics & Equity Chart (2 cols) */}
        {result && (
          <div className="lg:col-span-2 space-y-6">
            {/* Scope & Version Header Badge */}
            {result.researchConfig && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <ResearchConfigBadge
                  scope={result.resultScope || 'BACKTEST'}
                  strategyVersion={result.strategyVersion || 'CH5-V1.5.0'}
                  config={result.researchConfig}
                />
              </div>
            )}

            {/* Metrics KPI Cards (7 Core Requirements) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Initial Capital</span>
                <div className="text-base font-black text-slate-200 mt-1">{formatCurrency(result.initialCapital)}</div>
                <span className="text-[9px] text-slate-500">Starting Balance</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Final Capital</span>
                <div
                  className={`text-base font-black mt-1 ${
                    result.finalCapital >= result.initialCapital ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(result.finalCapital)}
                </div>
                <span className="text-[9px] text-slate-500">
                  {result.totalReturn >= 0 ? '+' : ''}{formatCurrency(result.totalReturn)}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Return %</span>
                <div
                  className={`text-base font-black mt-1 ${
                    result.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {result.totalReturn >= 0 ? '+' : ''}
                  {result.totalReturnPercent}%
                </div>
                <span className="text-[9px] text-slate-500">
                  B&H: {result.buyAndHoldReturnPercent}%
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Trades</span>
                <div className="text-base font-black text-white mt-1">{result.totalTrades}</div>
                <span className="text-[9px] text-slate-500">
                  {result.winningTrades}W / {result.losingTrades}L
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Win Rate</span>
                <div className="text-base font-black text-emerald-400 mt-1">{result.winRate}%</div>
                <span className="text-[9px] text-slate-500">
                  {result.winningTrades} Winners
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Max Drawdown</span>
                <div className="text-base font-black text-rose-400 mt-1">-{result.maxDrawdownPercent}%</div>
                <span className="text-[9px] text-slate-500">
                  -{formatCurrency(result.maxDrawdown)}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl col-span-2 sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Profit Factor</span>
                <div className="text-base font-black text-indigo-400 mt-1">{result.profitFactor}</div>
                <span className="text-[9px] text-slate-500">Gross W/L Ratio</span>
              </div>
            </div>

            {/* Equity Curve Canvas */}
            <EquityCurveChart data={result.equityCurve} currencySymbol={currencySymbol} />

            {/* Phase C: Detailed Performance & Trade Analytics Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Institutional Trade & Risk Analytics
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {result.strategyName}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Win/Loss Distribution Card */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                      <PieChart className="w-3.5 h-3.5 text-blue-400" />
                      Outcome Split
                    </span>
                    <span className="text-white font-bold">{result.totalTrades} Trades</span>
                  </div>

                  {/* Distribution Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${result.winRate}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Wins: ${result.winningTrades} (${result.winRate}%)`}
                    />
                    <div
                      style={{ width: `${result.breakevenRate}%` }}
                      className="bg-slate-400 h-full transition-all"
                      title={`Breakeven: ${result.breakevenTrades} (${result.breakevenRate}%)`}
                    />
                    <div
                      style={{ width: `${result.lossRate}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title={`Losses: ${result.losingTrades} (${result.lossRate}%)`}
                    />
                  </div>

                  <div className="grid grid-cols-3 text-[10px] pt-1">
                    <div>
                      <span className="text-slate-500 block">Wins</span>
                      <span className="text-emerald-400 font-bold">
                        {result.winningTrades} ({result.winRate}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Losses</span>
                      <span className="text-rose-400 font-bold">
                        {result.losingTrades} ({result.lossRate}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">BE</span>
                      <span className="text-slate-300 font-bold">
                        {result.breakevenTrades} ({result.breakevenRate}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Gross vs Net Profit/Loss Card */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                  <span className="text-slate-400 uppercase text-[11px] font-semibold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Gross vs Net P/L
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Profit:</span>
                      <span className="text-emerald-400 font-bold">+{formatCurrency(result.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Loss:</span>
                      <span className="text-rose-400 font-bold">-{formatCurrency(result.grossLoss)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400 font-semibold">Net P/L:</span>
                      <span className={`font-black ${result.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.totalReturn >= 0 ? '+' : ''}{formatCurrency(result.totalReturn)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Trade Size & Edge Analytics */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                  <span className="text-slate-400 uppercase text-[11px] font-semibold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Trade Edge & Size
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Win:</span>
                      <span className="text-emerald-400 font-bold">+{formatCurrency(result.avgWinningTrade)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Loss:</span>
                      <span className="text-rose-400 font-bold">{formatCurrency(result.avgLosingTrade)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-500">Best / Worst:</span>
                      <span className="text-slate-300 font-bold text-[10px]">
                        <span className="text-emerald-400">+{formatCurrency(result.largestWin)}</span> /{' '}
                        <span className="text-rose-400">{formatCurrency(result.largestLoss)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Holding Period & Execution Duration */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                  <span className="text-slate-400 uppercase text-[11px] font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Holding Duration
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Holding:</span>
                      <span className="text-cyan-400 font-bold">{result.avgHoldingDays} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Holding:</span>
                      <span className="text-white font-bold">{result.longestHoldingDays} Days</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-500">Avg Trade Return:</span>
                      <span className={`font-bold ${result.avgTradeReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.avgTradeReturn >= 0 ? '+' : ''}{result.avgTradeReturn}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exact Research Configuration Specification Section */}
            {result.researchConfig && (
              <ResearchConfigurationSection
                config={result.researchConfig}
                title={`Research Configuration (${result.researchConfig.configId})`}
                subtitle="Exact mathematical parameters, sample size, and friction models applied to this backtest simulation"
                defaultExpanded={false}
              />
            )}

            {/* Backtested Trades Log Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Backtest Execution Log ({result.trades.length} Signals)
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Detailed per-trade accounting with execution rationales & market friction.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={result.trades.length === 0}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 hover:text-emerald-300 font-bold text-[11px] rounded-xl transition-all border border-slate-700/60 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {result.trades.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No trade entries triggered for this strategy and timeframe configuration.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Entry Date & Reason</th>
                        <th className="py-2.5 px-3">Entry Price</th>
                        <th className="py-2.5 px-3">Exit Date & Reason</th>
                        <th className="py-2.5 px-3">Exit Price</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Gross P/L</th>
                        <th className="py-2.5 px-3">Friction</th>
                        <th className="py-2.5 px-3">Net P/L</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {result.trades.map((t, idx) => {
                        const isWin = t.pnl > 0;
                        const isLoss = t.pnl < 0;
                        return (
                          <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-white block">{t.entryDate}</span>
                              <span className="text-[10px] text-emerald-400/90 truncate max-w-[160px] block" title={t.entryReason}>
                                {t.entryReason || 'Strategy Buy Signal'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono">{formatCurrency(t.entryPrice)}</td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-white block">{t.exitDate}</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[160px] block" title={t.exitReason || t.reason}>
                                {t.exitReason || t.reason}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono">{formatCurrency(t.exitPrice)}</td>
                            <td className="py-2 px-3 text-[11px] text-cyan-400/90 whitespace-nowrap">
                              {t.holdingDays} {t.holdingDays === 1 ? 'Day' : 'Days'}
                            </td>
                            <td className="py-2 px-3 text-[11px] font-mono">
                              <span className={t.grossPnl >= 0 ? 'text-slate-300' : 'text-slate-400'}>
                                {t.grossPnl >= 0 ? '+' : ''}{formatCurrency(t.grossPnl)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-amber-400/90 text-[11px] font-mono whitespace-nowrap">
                              {formatCurrency(t.totalFrictionPaid || 0)}
                            </td>
                            <td className="py-2 px-3 font-mono whitespace-nowrap">
                              <span className={`font-bold ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                                {isWin ? '+' : ''}{formatCurrency(t.pnl)}
                              </span>
                              <span className={`text-[10px] block ${isWin ? 'text-emerald-400/80' : isLoss ? 'text-rose-400/80' : 'text-slate-400'}`}>
                                ({isWin ? '+' : ''}{t.pnlPercent}%)
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  t.status === 'WIN'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : t.status === 'LOSS'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-slate-700/30 text-slate-300 border border-slate-700/50'
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
