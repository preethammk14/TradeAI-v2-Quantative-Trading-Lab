import React, { useState, useMemo } from 'react';
import {
  History,
  Download,
  Trash2,
  Filter,
  Search,
  Calendar,
  Layers,
  Activity,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { PaperTrade, StockQuote } from '../types';
import { paperTradingService } from '../services/paperTradingService';
import { MarketDataFeedStatusBadge } from '../components/MarketDataFeedStatusBadge';
import { PerformanceMetricsCard, PerformanceMetricsData } from '../components/PerformanceMetricsCard';
import { DailyPnLChart, DailyPnLPoint } from '../components/DailyPnLChart';

interface TradeHistoryPageProps {
  trades: PaperTrade[];
  currencySymbol: string;
  onTradeExecuted: () => void;
  quotes?: StockQuote[];
}

export const TradeHistoryPage: React.FC<TradeHistoryPageProps> = ({
  trades,
  currencySymbol,
  onTradeExecuted,
  quotes = [],
}) => {
  // Filter state
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WINNERS' | 'LOSERS'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 1. Calculate transaction breakdown helpers
  // Standard model: ₹20 brokerage, 0.05% regulatory levies, 0.05% adverse slippage
  const getTradeFriction = (trade: PaperTrade) => {
    const entryTurnover = trade.entryPrice * trade.quantity;
    const exitPrice = trade.exitPrice || trade.currentPrice || trade.entryPrice;
    const exitTurnover = exitPrice * trade.quantity;
    const totalTurnover = entryTurnover + (trade.status === 'CLOSED' ? exitTurnover : 0);

    const brokerage = trade.brokerage !== undefined ? trade.brokerage : 20 * (trade.status === 'CLOSED' ? 2 : 1);
    const regulatoryFees = trade.fees !== undefined ? trade.fees : totalTurnover * 0.0005;
    const slippage = trade.slippage !== undefined ? trade.slippage : totalTurnover * 0.0005;
    const totalFriction = brokerage + regulatoryFees + slippage;

    // Gross P/L
    let grossPnL = 0;
    if (trade.grossPnL !== undefined) {
      grossPnL = trade.grossPnL;
    } else if (trade.status === 'CLOSED' && trade.exitPrice) {
      const dirMult = trade.action === 'BUY' ? 1 : -1;
      grossPnL = (trade.exitPrice - trade.entryPrice) * trade.quantity * dirMult;
    } else {
      const currentPrice = trade.currentPrice || trade.entryPrice;
      const dirMult = trade.action === 'BUY' ? 1 : -1;
      grossPnL = (currentPrice - trade.entryPrice) * trade.quantity * dirMult;
    }

    // Net P/L
    const netPnL = trade.status === 'CLOSED' ? (trade.realizedPnL !== undefined ? trade.realizedPnL : grossPnL - totalFriction) : (trade.unrealizedPnL || 0);

    return {
      brokerage,
      regulatoryFees,
      slippage,
      totalFriction,
      grossPnL,
      netPnL,
    };
  };

  // 2. Filter application
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Symbol filter
      const matchesSymbol =
        filterSymbol === '' ||
        t.symbol.toLowerCase().includes(filterSymbol.toLowerCase()) ||
        t.stockName.toLowerCase().includes(filterSymbol.toLowerCase());

      // Status filter
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;

      // Direction filter
      const matchesDirection = filterDirection === 'ALL' || t.action === filterDirection;

      // Date range filter
      const tradeDateStr = t.closedAt || t.openedAt || t.timestamp || '';
      let matchesDate = true;
      if (startDate && tradeDateStr) {
        matchesDate = matchesDate && tradeDateStr.slice(0, 10) >= startDate;
      }
      if (endDate && tradeDateStr) {
        matchesDate = matchesDate && tradeDateStr.slice(0, 10) <= endDate;
      }

      // Outcome filter (Winning / Losing)
      let matchesOutcome = true;
      if (filterOutcome !== 'ALL') {
        const { netPnL } = getTradeFriction(t);
        if (filterOutcome === 'WINNERS') {
          matchesOutcome = netPnL > 0;
        } else if (filterOutcome === 'LOSERS') {
          matchesOutcome = netPnL < 0;
        }
      }

      return matchesSymbol && matchesStatus && matchesDirection && matchesDate && matchesOutcome;
    });
  }, [trades, filterSymbol, filterStatus, filterDirection, filterOutcome, startDate, endDate]);

  // 3. Compute Performance Analytics Metrics (Strictly from actual paper ledger)
  const performanceMetrics: PerformanceMetricsData = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status === 'CLOSED');
    const totalTrades = trades.length;

    let winningTrades = 0;
    let losingTrades = 0;
    let totalGrossProfit = 0;
    let totalGrossLoss = 0;
    let grossPnLTotal = 0;
    let netPnLTotal = 0;
    let brokerageTotal = 0;
    let regulatoryFeesTotal = 0;
    let slippageTotal = 0;
    let largestWin = 0;
    let largestLoss = 0;

    let winAmountsSum = 0;
    let lossAmountsSum = 0;

    closedTrades.forEach((t) => {
      const { brokerage, regulatoryFees, slippage, grossPnL, netPnL } = getTradeFriction(t);

      brokerageTotal += brokerage;
      regulatoryFeesTotal += regulatoryFees;
      slippageTotal += slippage;
      grossPnLTotal += grossPnL;
      netPnLTotal += netPnL;

      if (netPnL > 0) {
        winningTrades += 1;
        totalGrossProfit += grossPnL;
        winAmountsSum += netPnL;
        if (netPnL > largestWin) largestWin = netPnL;
      } else if (netPnL < 0) {
        losingTrades += 1;
        totalGrossLoss += Math.abs(grossPnL);
        lossAmountsSum += Math.abs(netPnL);
        if (netPnL < largestLoss) largestLoss = netPnL;
      }
    });

    const totalFees = brokerageTotal + regulatoryFeesTotal + slippageTotal;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
    const avgWinningTrade = winningTrades > 0 ? winAmountsSum / winningTrades : 0;
    const avgLosingTrade = losingTrades > 0 ? lossAmountsSum / losingTrades : 0;

    const profitFactor =
      totalGrossLoss > 0
        ? totalGrossProfit / totalGrossLoss
        : totalGrossProfit > 0
        ? Infinity
        : 0;

    // Drawdown computation over closed equity curve
    let peakEquity = 100000;
    let currentEquity = 100000;
    let maxDrawdown = 0;

    // Sort closed trades chronologically to compute equity curve
    const sortedClosed = [...closedTrades].sort((a, b) => {
      const timeA = new Date(a.closedAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.closedAt || b.timestamp || 0).getTime();
      return timeA - timeB;
    });

    sortedClosed.forEach((t) => {
      const { netPnL } = getTradeFriction(t);
      currentEquity += netPnL;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const dd = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    });

    const availableCash = paperTradingService.getAvailableCash();
    const portfolioSummary = paperTradingService.getPortfolioSummary(quotes).summary;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      grossPnL: Number(grossPnLTotal.toFixed(2)),
      brokerageTotal: Number(brokerageTotal.toFixed(2)),
      regulatoryFeesTotal: Number(regulatoryFeesTotal.toFixed(2)),
      slippageTotal: Number(slippageTotal.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      netPnL: Number(netPnLTotal.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      avgWinningTrade: Number(avgWinningTrade.toFixed(2)),
      avgLosingTrade: Number(avgLosingTrade.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      largestWin: Number(largestWin.toFixed(2)),
      largestLoss: Number(largestLoss.toFixed(2)),
      virtualCash: availableCash,
      portfolioValue: portfolioSummary.totalValue,
    };
  }, [trades, quotes]);

  // 4. Daily P/L points directly from recorded closed trades
  const dailyPnLData: DailyPnLPoint[] = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status === 'CLOSED');
    if (closedTrades.length === 0) return [];

    const dateMap = new Map<string, { realizedPnL: number; grossPnL: number; totalFees: number; count: number }>();

    closedTrades.forEach((t) => {
      const dateKey = (t.closedAt || t.openedAt || t.timestamp || new Date().toISOString()).slice(0, 10);
      const { grossPnL, totalFriction, netPnL } = getTradeFriction(t);

      const existing = dateMap.get(dateKey) || { realizedPnL: 0, grossPnL: 0, totalFees: 0, count: 0 };
      dateMap.set(dateKey, {
        realizedPnL: existing.realizedPnL + netPnL,
        grossPnL: existing.grossPnL + grossPnL,
        totalFees: existing.totalFees + totalFriction,
        count: existing.count + 1,
      });
    });

    // Sort chronologically
    const sortedDates = Array.from(dateMap.keys()).sort();
    let runningCumulative = 0;

    return sortedDates.map((date) => {
      const entry = dateMap.get(date)!;
      runningCumulative += entry.realizedPnL;
      return {
        date,
        realizedPnL: Number(entry.realizedPnL.toFixed(2)),
        grossPnL: Number(entry.grossPnL.toFixed(2)),
        totalFees: Number(entry.totalFees.toFixed(2)),
        tradesCount: entry.count,
        cumulativePnL: Number(runningCumulative.toFixed(2)),
      };
    });
  }, [trades]);

  const handleClearHistory = () => {
    if (
      window.confirm(
        'WARNING: Are you sure you want to reset your paper trading portfolio? All active holdings and trade history will be permanently erased, and your virtual capital will be restored to ₹1,00,000.'
      )
    ) {
      paperTradingService.resetPortfolio();
      onTradeExecuted();
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Trade_ID',
      'Timestamp',
      'Symbol',
      'Stock_Name',
      'Direction',
      'Order_Type',
      'Quantity',
      'Entry_Price',
      'Exit_Price',
      'Gross_PnL',
      'Brokerage',
      'Regulatory_Fees',
      'Slippage',
      'Total_Friction',
      'Net_PnL',
      'Trade_Status',
      'Data_Classification',
    ];

    const rows = filteredTrades.map((t) => {
      const friction = getTradeFriction(t);
      const timeStr = t.closedAt || t.openedAt || t.timestamp || '';
      return [
        t.id,
        `"${timeStr}"`,
        t.symbol,
        `"${t.stockName}"`,
        t.action,
        t.orderType,
        t.quantity,
        t.entryPrice.toFixed(2),
        t.exitPrice ? t.exitPrice.toFixed(2) : '',
        friction.grossPnL.toFixed(2),
        friction.brokerage.toFixed(2),
        friction.regulatoryFees.toFixed(2),
        friction.slippage.toFixed(2),
        friction.totalFriction.toFixed(2),
        friction.netPnL.toFixed(2),
        t.status,
        'SIMULATED_PAPER_EXECUTION',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TradeAI_Paper_Trade_Audit_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    const sign = val < 0 ? '-' : '';
    const absVal = Math.abs(val);
    return `${sign}${currencySymbol}${absVal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Distinction Badge Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-400" />
              <span>Paper Trade History & Performance Analytics</span>
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              100% Simulated Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of executed virtual orders, transaction fees, slippage, and double-entry accounting reconciliation
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Audit CSV</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-all flex items-center gap-2 border border-rose-500/30"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Reset Ledger</span>
          </button>
        </div>
      </div>

      {/* 2. System Status & Strict Data Classification Legend (Item 5 Requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Real Market Data Badge */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white block">REAL MARKET DATA</span>
            <span className="text-[11px] text-slate-400">
              Validated Alpha Vantage provider price feed (OHLC verified)
            </span>
          </div>
        </div>

        {/* Simulated Paper Trades Badge */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white block">SIMULATED PAPER TRADES</span>
            <span className="text-[11px] text-slate-400">
              100% Virtual execution with ₹20 brokerage, 0.05% STT & slippage
            </span>
          </div>
        </div>

        {/* No Data Available / Offline Badge */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white block">FAIL-SAFE PAUSE GATE</span>
            <span className="text-[11px] text-slate-400">
              Zero fake data — halts paper orders if feed is offline/rate-limited
            </span>
          </div>
        </div>
      </div>

      {/* 3. Performance Metrics Dashboard (Item 2 Requirement) */}
      <PerformanceMetricsCard metrics={performanceMetrics} currencySymbol={currencySymbol} />

      {/* 4. Daily Realized P/L Chart (Item 3 Requirement) */}
      <DailyPnLChart data={dailyPnLData} currencySymbol={currencySymbol} />

      {/* 5. Comprehensive Filtering Toolbar (Item 4 Requirement) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Filter & Search Audit Records
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Showing {filteredTrades.length} of {trades.length} trades
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Symbol Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="ALL">Status: All (Open & Closed)</option>
              <option value="OPEN">Status: Open Positions Only</option>
              <option value="CLOSED">Status: Closed Positions Only</option>
            </select>
          </div>

          {/* Direction Filter */}
          <div>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="ALL">Direction: All (BUY & SELL)</option>
              <option value="BUY">Direction: BUY Orders</option>
              <option value="SELL">Direction: SELL Orders</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="ALL">Outcome: All Trades</option>
              <option value="WINNERS">Outcome: Winning Trades Only</option>
              <option value="LOSERS">Outcome: Losing Trades Only</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              title="End Date"
            />
          </div>
        </div>

        {/* Active Filters Clear Button if active */}
        {(filterSymbol || filterStatus !== 'ALL' || filterDirection !== 'ALL' || filterOutcome !== 'ALL' || startDate || endDate) && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-indigo-300">Custom filters applied</span>
            <button
              onClick={() => {
                setFilterSymbol('');
                setFilterStatus('ALL');
                setFilterDirection('ALL');
                setFilterOutcome('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* 6. Complete Trade History Table (Item 1 & Item 6 Requirements) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Virtual Trade Execution Audit Log
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
            Double-Entry Accounting Invariant Protected
          </span>
        </div>

        {/* Clean Empty State (Item 6 Requirement) */}
        {trades.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Activity className="w-10 h-10 text-slate-400 mx-auto opacity-40 animate-pulse" />
            <p className="text-sm font-bold text-slate-300">
              No trades yet — waiting for validated market observations
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Simulated paper orders will execute and record here automatically as validated Alpha Vantage candles trigger Champion #5 indicator confluence signals.
            </p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Filter className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No paper trade records match your filter criteria.</p>
            <p className="text-[11px] text-slate-400">Try adjusting your symbol, status, or date range filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Symbol</th>
                  <th className="py-3 px-3">Direction</th>
                  <th className="py-3 px-3">Qty</th>
                  <th className="py-3 px-3">Entry Price</th>
                  <th className="py-3 px-3">Exit Price</th>
                  <th className="py-3 px-3">Gross P/L</th>
                  <th className="py-3 px-3">Brokerage</th>
                  <th className="py-3 px-3">Fees (STT)</th>
                  <th className="py-3 px-3">Slippage</th>
                  <th className="py-3 px-3">Net P/L</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTrades.map((t) => {
                  const friction = getTradeFriction(t);
                  const isNetWin = friction.netPnL >= 0;
                  const isGrossWin = friction.grossPnL >= 0;
                  const timeStr = t.closedAt || t.openedAt || t.timestamp || 'N/A';

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Timestamp */}
                      <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {timeStr}
                      </td>

                      {/* 2. Symbol */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{t.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-sans truncate max-w-[120px] block">
                          {t.stockName}
                        </span>
                      </td>

                      {/* 3. Direction */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            t.action === 'BUY'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {t.action === 'BUY' ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {t.action}
                        </span>
                      </td>

                      {/* 4. Quantity */}
                      <td className="py-3 px-3 font-semibold text-white">{t.quantity}</td>

                      {/* 5. Entry Price */}
                      <td className="py-3 px-3">{formatCurrency(t.entryPrice)}</td>

                      {/* 6. Exit Price */}
                      <td className="py-3 px-3 text-slate-300">
                        {t.status === 'CLOSED' && t.exitPrice ? formatCurrency(t.exitPrice) : '—'}
                      </td>

                      {/* 7. Gross P/L */}
                      <td className={`py-3 px-3 font-bold ${isGrossWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isGrossWin ? '+' : ''}{formatCurrency(friction.grossPnL)}
                      </td>

                      {/* 8. Brokerage */}
                      <td className="py-3 px-3 text-amber-300">
                        {formatCurrency(friction.brokerage)}
                      </td>

                      {/* 9. Fees (STT/Levies) */}
                      <td className="py-3 px-3 text-amber-300">
                        {formatCurrency(friction.regulatoryFees)}
                      </td>

                      {/* 10. Slippage */}
                      <td className="py-3 px-3 text-amber-300">
                        {formatCurrency(friction.slippage)}
                      </td>

                      {/* 11. Net P/L */}
                      <td className={`py-3 px-3 font-bold ${isNetWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isNetWin ? '+' : ''}{formatCurrency(friction.netPnL)}
                      </td>

                      {/* 12. Trade Status */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'OPEN'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
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

      {/* 7. Methodology & Scientific Disclaimer Box (Item 9 Requirement) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <AlertOctagon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-300">
            Observation Integrity & Anti-Hallucination Mandate
          </p>
          <p className="text-[11px] leading-relaxed">
            All performance metrics and trade logs are calculated strictly from executed paper-trading events. Simulated returns, win rates, and profit factors do not constitute proof of real-world trading edge. Robust statistical validation requires ongoing observation across diverse market regimes.
          </p>
        </div>
      </div>
    </div>
  );
};
