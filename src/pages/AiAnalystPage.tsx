import React, { useState, useMemo } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Zap,
  Sparkles,
  RefreshCw,
  Gauge,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  HelpCircle,
  BarChart2,
  Info,
} from 'lucide-react';
import { StockQuote } from '../types';
import { getStockBySymbol, MOCK_STOCKS } from '../data/mockStocks';
import {
  computeAllIndicators,
  estimateSupportResistance,
  calculateATR,
} from '../services/technicalAnalysisService';
import { NavTab } from '../components/Navbar';

interface AiAnalystPageProps {
  quotes: StockQuote[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  currencySymbol: string;
  onNavigate: (tab: NavTab) => void;
}

export const AiAnalystPage: React.FC<AiAnalystPageProps> = ({
  quotes,
  selectedSymbol,
  onSelectStock,
  currencySymbol,
  onNavigate,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Find selected stock from quotes or fallback to standard demo stocks
  const currentStock = useMemo(() => {
    return (
      quotes.find((q) => q.symbol === selectedSymbol) ||
      getStockBySymbol(selectedSymbol) ||
      MOCK_STOCKS[0]
    );
  }, [quotes, selectedSymbol]);

  // Handle re-running the deterministic AI evaluation with visual feedback
  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setAnalysisTimestamp(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setIsAnalyzing(false);
    }, 400);
  };

  // Perform full deterministic quantitative indicator evaluation on available demo data
  const analysisData = useMemo(() => {
    if (!currentStock || !currentStock.history || currentStock.history.length < 30) {
      return null;
    }

    const history = currentStock.history;
    const currentPrice = currentStock.price;
    const closePrices = history.map((p) => p.close);

    // Compute technical indicators from demo series
    const indicators = computeAllIndicators(history);
    const { support, resistance } = estimateSupportResistance(history);
    const atrSeries = calculateATR(history, 14);

    // Latest Indicator Values
    const rsiSeries = indicators.rsi14 || [];
    const latestRsi = rsiSeries[rsiSeries.length - 1] ?? 50;

    const sma20Series = indicators.sma20 || [];
    const latestSma20 = sma20Series[sma20Series.length - 1] ?? currentPrice;

    const sma50Series = indicators.sma50 || [];
    const latestSma50 = sma50Series[sma50Series.length - 1] ?? currentPrice;

    const macdLineSeries = indicators.macd?.macdLine || [];
    const signalLineSeries = indicators.macd?.signalLine || [];
    const histSeries = indicators.macd?.histogram || [];

    const latestMacdLine = macdLineSeries[macdLineSeries.length - 1] ?? 0;
    const latestSignalLine = signalLineSeries[signalLineSeries.length - 1] ?? 0;
    const latestHist = histSeries[histSeries.length - 1] ?? 0;

    const latestAtr = atrSeries[atrSeries.length - 1] ?? currentPrice * 0.015;

    // Calculate 30-day realized volatility
    const recentCloses = closePrices.slice(-30);
    const returns: number[] = [];
    for (let i = 1; i < recentCloses.length; i++) {
      returns.push((recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1]);
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
    const variance =
      returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length || 1);
    const dailyVolPercent = Math.sqrt(variance) * 100;
    const annualizedVolPercent = dailyVolPercent * Math.sqrt(252);

    let volatilityCategory: 'LOW' | 'MODERATE' | 'HIGH' = 'MODERATE';
    if (dailyVolPercent < 1.4) volatilityCategory = 'LOW';
    else if (dailyVolPercent > 2.8) volatilityCategory = 'HIGH';

    // 52-Week / Historical Range
    const allHighs = history.map((p) => p.high);
    const allLows = history.map((p) => p.low);
    const historicalHigh = Math.max(...allHighs);
    const historicalLow = Math.min(...allLows);

    // Rule Conditions Evaluation for "Why this signal?"
    const conditions: Array<{
      title: string;
      desc: string;
      met: boolean;
      bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    }> = [];

    // 1. Moving Average Trend Alignment
    const isSmaBullish = latestSma20 > latestSma50;
    conditions.push({
      title: 'Trend Alignment (SMA 20 vs SMA 50)',
      desc: isSmaBullish
        ? `20-SMA (${currencySymbol}${latestSma20.toFixed(2)}) > 50-SMA (${currencySymbol}${latestSma50.toFixed(2)}) indicates upward intermediate trend structure.`
        : `20-SMA (${currencySymbol}${latestSma20.toFixed(2)}) < 50-SMA (${currencySymbol}${latestSma50.toFixed(2)}) indicates downward/bearish intermediate trend structure.`,
      met: true,
      bias: isSmaBullish ? 'BULLISH' : 'BEARISH',
    });

    // 2. Price Position vs Fast SMA
    const isPriceAboveSma20 = currentPrice >= latestSma20;
    conditions.push({
      title: 'Price vs 20-Day SMA',
      desc: isPriceAboveSma20
        ? `Current price (${currencySymbol}${currentPrice.toFixed(2)}) is trading above the 20-day baseline (${currencySymbol}${latestSma20.toFixed(2)}).`
        : `Current price (${currencySymbol}${currentPrice.toFixed(2)}) is lagging below the 20-day baseline (${currencySymbol}${latestSma20.toFixed(2)}).`,
      met: true,
      bias: isPriceAboveSma20 ? 'BULLISH' : 'BEARISH',
    });

    // 3. RSI Oscillator State
    let rsiBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let rsiInterpretation = '';
    if (latestRsi >= 70) {
      rsiBias = 'BEARISH';
      rsiInterpretation = `Overbought (${latestRsi.toFixed(1)}) — Elevated reading approaching mean-reversion exhaustion zone.`;
    } else if (latestRsi <= 30) {
      rsiBias = 'BULLISH';
      rsiInterpretation = `Oversold (${latestRsi.toFixed(1)}) — Deep technical discount with potential rebound bounce.`;
    } else if (latestRsi >= 50) {
      rsiBias = 'BULLISH';
      rsiInterpretation = `Bullish Momentum (${latestRsi.toFixed(1)}) — Healthy buyer momentum above centerline 50.`;
    } else {
      rsiBias = 'BEARISH';
      rsiInterpretation = `Bearish Momentum (${latestRsi.toFixed(1)}) — Selling pressure prevailing below centerline 50.`;
    }

    conditions.push({
      title: 'RSI(14) Momentum Indicator',
      desc: rsiInterpretation,
      met: true,
      bias: rsiBias,
    });

    // 4. MACD Histogram & Crossover
    let macdBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let macdInterpretation = '';
    if (latestMacdLine > latestSignalLine && latestHist >= 0) {
      macdBias = 'BULLISH';
      macdInterpretation = `Bullish Crossover — MACD line (${latestMacdLine.toFixed(2)}) sits above Signal line (${latestSignalLine.toFixed(2)}) with positive histogram expansion (${latestHist.toFixed(2)}).`;
    } else if (latestMacdLine < latestSignalLine && latestHist <= 0) {
      macdBias = 'BEARISH';
      macdInterpretation = `Bearish Crossover — MACD line (${latestMacdLine.toFixed(2)}) is below Signal line (${latestSignalLine.toFixed(2)}) with negative histogram expansion (${latestHist.toFixed(2)}).`;
    } else if (latestMacdLine > latestSignalLine) {
      macdBias = 'BULLISH';
      macdInterpretation = `Bullish Bias — MACD line is above Signal, though histogram momentum is contracting (${latestHist.toFixed(2)}).`;
    } else {
      macdBias = 'BEARISH';
      macdInterpretation = `Bearish Bias — MACD line is below Signal, though downward histogram pressure is decelerating.`;
    }

    conditions.push({
      title: 'MACD (12, 26, 9) Signal Status',
      desc: macdInterpretation,
      met: true,
      bias: macdBias,
    });

    // 5. Support / Resistance Boundary Distance
    const distToSupport = ((currentPrice - support) / support) * 100;
    const distToResistance = ((resistance - currentPrice) / currentPrice) * 100;

    let sRInterpretation = '';
    let sRBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

    if (distToSupport <= 3) {
      sRBias = 'BULLISH';
      sRInterpretation = `Trading within ${distToSupport.toFixed(1)}% of key support (${currencySymbol}${support.toFixed(2)}), offering favorable risk-defined bounce entry.`;
    } else if (distToResistance <= 3) {
      sRBias = 'BEARISH';
      sRInterpretation = `Testing overhead resistance (${currencySymbol}${resistance.toFixed(2)}) within ${distToResistance.toFixed(1)}%, facing immediate selling supply.`;
    } else {
      sRBias = 'NEUTRAL';
      sRInterpretation = `Consolidating in mid-channel between support (${currencySymbol}${support.toFixed(2)}) and resistance (${currencySymbol}${resistance.toFixed(2)}).`;
    }

    conditions.push({
      title: 'Key Price Channel Boundaries',
      desc: sRInterpretation,
      met: true,
      bias: sRBias,
    });

    // Synthesize Quantitative Decision Score
    let bullishCount = 0;
    let bearishCount = 0;

    conditions.forEach((c) => {
      if (c.bias === 'BULLISH') bullishCount++;
      if (c.bias === 'BEARISH') bearishCount++;
    });

    let overallSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let marketTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let momentum: 'STRONG BULLISH' | 'MODERATE BULLISH' | 'NEUTRAL' | 'MODERATE BEARISH' | 'STRONG BEARISH' = 'NEUTRAL';
    let confidence = 65;

    if (bullishCount >= 3 && bullishCount > bearishCount) {
      overallSignal = 'BUY';
      marketTrend = 'BULLISH';
      momentum = latestRsi >= 60 ? 'STRONG BULLISH' : 'MODERATE BULLISH';
      confidence = Math.min(92, 65 + bullishCount * 6);
    } else if (bearishCount >= 3 && bearishCount > bullishCount) {
      overallSignal = 'SELL';
      marketTrend = 'BEARISH';
      momentum = latestRsi <= 40 ? 'STRONG BEARISH' : 'MODERATE BEARISH';
      confidence = Math.min(90, 65 + bearishCount * 6);
    } else {
      overallSignal = 'HOLD';
      marketTrend = isSmaBullish ? 'BULLISH' : 'NEUTRAL';
      momentum = 'NEUTRAL';
      confidence = 68;
    }

    // Targets & Educational Risk Zones
    const suggestedEntryZone = `${currencySymbol}${(currentPrice * 0.995).toFixed(2)} – ${currencySymbol}${(currentPrice * 1.005).toFixed(2)}`;
    const stopLossVal =
      overallSignal === 'BUY'
        ? Math.min(support * 0.985, currentPrice - 2 * latestAtr)
        : Math.max(resistance * 1.015, currentPrice + 2 * latestAtr);

    const takeProfitVal =
      overallSignal === 'BUY'
        ? Math.max(resistance * 0.99, currentPrice + 3 * latestAtr)
        : Math.min(support * 1.01, currentPrice - 3 * latestAtr);

    const riskAmt = Math.abs(currentPrice - stopLossVal);
    const rewardAmt = Math.abs(takeProfitVal - currentPrice);
    const rrRatio = riskAmt > 0 ? (rewardAmt / riskAmt).toFixed(1) : '2.0';

    return {
      currentPrice,
      latestRsi,
      latestSma20,
      latestSma50,
      latestMacdLine,
      latestSignalLine,
      latestHist,
      latestAtr,
      support,
      resistance,
      dailyVolPercent,
      annualizedVolPercent,
      volatilityCategory,
      historicalHigh,
      historicalLow,
      marketTrend,
      momentum,
      rsiInterpretation,
      macdInterpretation,
      overallSignal,
      confidence,
      conditions,
      suggestedEntryZone,
      suggestedStopLoss: `${currencySymbol}${stopLossVal.toFixed(2)}`,
      suggestedTakeProfit: `${currencySymbol}${takeProfitVal.toFixed(2)}`,
      riskRewardRatio: `1 : ${rrRatio}`,
    };
  }, [currentStock, currencySymbol]);

  return (
    <div className="space-y-6">
      {/* 1. Prominent Simulated / Demo Data Disclaimer Banner (Requirement 6 & 9) */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-300">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="font-bold text-amber-400 uppercase tracking-wide mr-2">
              DEMO / SIMULATED DATA DISCLAIMER:
            </strong>
            <span>
              All signals and indicator values are computed strictly from deterministic historical demo price series. This is an educational research tool and does NOT constitute financial advice or live-market predictions.
            </span>
          </div>
        </div>
        <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
          Deterministic Engine
        </span>
      </div>

      {/* 2. Top Asset Selector & Control Header (Requirements 1 & 7) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Quantitative AI Market Analyst</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                Rule-Based Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic technical pattern recognition, oscillator evaluation, and rule-based signal synthesis
            </p>
          </div>
        </div>

        {/* Symbol Selector & Run AI Analysis Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Select Symbol:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => onSelectStock(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-emerald-500"
            >
              {MOCK_STOCKS.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Evaluating...' : 'Run AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* 3. Missing / Insufficient Data Graceful Handling (Requirement 9) */}
      {!analysisData ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Info className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Insufficient Historical Demo Data</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Minimum 30 historical candles required to calculate SMA(20), SMA(50), RSI(14), and MACD. Please select a supported asset like AAPL, MSFT, NVDA, AMZN, TSLA, GOOGL, RELIANCE, or INFY.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4. Basic Price Statistics Banner (Requirement 2) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Price Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Demo Price</span>
              <div className="text-base font-black text-white mt-0.5">
                {currencySymbol}{currentStock.price.toFixed(2)}
              </div>
              <span
                className={`text-[11px] font-bold flex items-center gap-0.5 ${
                  currentStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentStock.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent}% ({currencySymbol}{currentStock.change.toFixed(2)})
              </span>
            </div>

            {/* Day Range */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Day High / Low</span>
              <div className="text-xs font-bold text-white mt-1">
                H: <span className="text-emerald-400 font-mono">{currencySymbol}{currentStock.high.toFixed(2)}</span>
              </div>
              <div className="text-xs font-bold text-white">
                L: <span className="text-rose-400 font-mono">{currencySymbol}{currentStock.low.toFixed(2)}</span>
              </div>
            </div>

            {/* Support & Resistance */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Support & Resistance</span>
              <div className="text-xs font-bold text-white mt-1">
                Sup: <span className="text-emerald-400 font-mono">{currencySymbol}{analysisData.support.toFixed(2)}</span>
              </div>
              <div className="text-xs font-bold text-white">
                Res: <span className="text-rose-400 font-mono">{currencySymbol}{analysisData.resistance.toFixed(2)}</span>
              </div>
            </div>

            {/* Historical 52W / Total Range */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Historical Range</span>
              <div className="text-xs font-bold text-white mt-1">
                Max: <span className="text-slate-200 font-mono">{currencySymbol}{analysisData.historicalHigh.toFixed(2)}</span>
              </div>
              <div className="text-xs font-bold text-white">
                Min: <span className="text-slate-200 font-mono">{currencySymbol}{analysisData.historicalLow.toFixed(2)}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">24h Demo Volume</span>
              <div className="text-base font-bold text-slate-200 mt-0.5">
                {(currentStock.volume / 1000000).toFixed(2)}M
              </div>
              <span className="text-[10px] text-slate-500 block">Shares traded</span>
            </div>

            {/* Day Open & Prev Close */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Open / Prev Close</span>
              <div className="text-xs text-slate-300 mt-1">
                Open: <span className="font-mono">{currencySymbol}{currentStock.open.toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-400">
                Prev: <span className="font-mono">{currencySymbol}{currentStock.previousClose.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 5. Primary AI Decision Panel & Technical Indicator Diagnostics (Requirements 3, 4, 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Overall Signal & Core Executive Metrics (Requirement 5) */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-center">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">
                    Deterministic AI Signal
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{analysisTimestamp}</span>
                </div>

                {/* Main Signal Display (BUY / SELL / HOLD) */}
                <div
                  className={`text-4xl font-black py-4 rounded-xl border shadow-inner ${
                    analysisData.overallSignal === 'BUY'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : analysisData.overallSignal === 'SELL'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {analysisData.overallSignal}
                </div>

                {/* Market Trend & Confidence Metrics */}
                <div className="grid grid-cols-2 gap-2.5 text-xs text-left">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px] uppercase">Market Trend</span>
                    <strong
                      className={`text-sm font-bold block mt-0.5 ${
                        analysisData.marketTrend === 'BULLISH'
                          ? 'text-emerald-400'
                          : analysisData.marketTrend === 'BEARISH'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {analysisData.marketTrend}
                    </strong>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px] uppercase">Confidence</span>
                    <strong className="text-sm text-white font-bold block mt-0.5">
                      {analysisData.confidence}%
                    </strong>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px] uppercase">Momentum</span>
                    <strong className="text-xs text-slate-200 font-bold block mt-0.5">
                      {analysisData.momentum}
                    </strong>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px] uppercase">Volatility</span>
                    <strong className="text-xs text-indigo-300 font-bold block mt-0.5">
                      {analysisData.volatilityCategory} ({analysisData.dailyVolPercent.toFixed(1)}%/d)
                    </strong>
                  </div>
                </div>

                {/* Paper Trading Fast Navigation */}
                <button
                  onClick={() => onNavigate('paper-trading')}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Paper Trade {selectedSymbol}</span>
                </button>
              </div>

              {/* Educational Targets & Execution Zones */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span>Educational Risk & Price Boundaries</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Suggested Entry:</span>
                    <span className="font-bold text-white">{analysisData.suggestedEntryZone}</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Stop Loss:</span>
                    <span className="font-bold text-rose-400">{analysisData.suggestedStopLoss}</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Take Profit:</span>
                    <span className="font-bold text-emerald-400">{analysisData.suggestedTakeProfit}</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Risk / Reward Ratio:</span>
                    <span className="font-bold text-indigo-400">{analysisData.riskRewardRatio}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Columns (2 cols): Indicator Calculations & "Why this signal?" Explanations */}
            <div className="lg:col-span-2 space-y-5">
              {/* Technical Indicator Values Grid (Requirement 3) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Calculated Technical Indicators</h3>
                  </div>
                  <span className="text-[10px] text-slate-500">Asset: {currentStock.name} ({currentStock.symbol})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {/* RSI (14) */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">RSI (14 Period)</span>
                    <div className="text-lg font-black text-white">
                      {analysisData.latestRsi.toFixed(1)}
                    </div>
                    <span
                      className={`text-[10px] font-bold block ${
                        analysisData.latestRsi >= 70
                          ? 'text-rose-400'
                          : analysisData.latestRsi <= 30
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {analysisData.latestRsi >= 70
                        ? 'Overbought (>70)'
                        : analysisData.latestRsi <= 30
                        ? 'Oversold (<30)'
                        : 'Neutral Zone (30–70)'}
                    </span>
                  </div>

                  {/* SMA (20) */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">SMA (20 Period)</span>
                    <div className="text-lg font-black text-white">
                      {currencySymbol}{analysisData.latestSma20.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Price is {analysisData.currentPrice >= analysisData.latestSma20 ? 'above' : 'below'} 20-SMA
                    </span>
                  </div>

                  {/* SMA (50) */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">SMA (50 Period)</span>
                    <div className="text-lg font-black text-white">
                      {currencySymbol}{analysisData.latestSma50.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {analysisData.latestSma20 > analysisData.latestSma50 ? 'Golden alignment (20>50)' : 'Bearish alignment (20<50)'}
                    </span>
                  </div>

                  {/* MACD Line & Signal */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">MACD (12, 26, 9)</span>
                    <div className="text-sm font-bold text-white flex items-center justify-between">
                      <span>Line: {analysisData.latestMacdLine.toFixed(2)}</span>
                      <span className="text-slate-400">Sig: {analysisData.latestSignalLine.toFixed(2)}</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 block">
                      Hist: {analysisData.latestHist >= 0 ? '+' : ''}{analysisData.latestHist.toFixed(2)}
                    </span>
                  </div>

                  {/* Average True Range (ATR) */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ATR (14 Period)</span>
                    <div className="text-lg font-black text-white">
                      {currencySymbol}{analysisData.latestAtr.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Daily Range: ~{((analysisData.latestAtr / analysisData.currentPrice) * 100).toFixed(1)}% of price
                    </span>
                  </div>

                  {/* Realized Volatility */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Realized Volatility</span>
                    <div className="text-lg font-black text-slate-200">
                      {analysisData.annualizedVolPercent.toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-indigo-300 block">
                      {analysisData.dailyVolPercent.toFixed(2)}% Daily Sigma
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. "Why this signal?" Section (Requirement 8) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Why this signal?</h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Deterministic Indicator Conditions for <strong className="text-white">{selectedSymbol}</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {analysisData.conditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{cond.title}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            cond.bias === 'BULLISH'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : cond.bias === 'BEARISH'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {cond.bias}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 pl-6 leading-relaxed">
                        {cond.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Synthesis Summary */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Signal Synthesis Summary</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Based on {currentStock.name} ({currentStock.symbol}) historical daily candles, the deterministic decision engine registered{' '}
                    <strong className="text-white">
                      {analysisData.conditions.filter((c) => c.bias === 'BULLISH').length} Bullish
                    </strong>
                    ,{' '}
                    <strong className="text-white">
                      {analysisData.conditions.filter((c) => c.bias === 'BEARISH').length} Bearish
                    </strong>
                    , and{' '}
                    <strong className="text-white">
                      {analysisData.conditions.filter((c) => c.bias === 'NEUTRAL').length} Neutral
                    </strong>{' '}
                    indicator conditions, arriving at an overall <strong className="text-emerald-400">{analysisData.overallSignal}</strong> recommendation with <strong className="text-white">{analysisData.confidence}%</strong> confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
