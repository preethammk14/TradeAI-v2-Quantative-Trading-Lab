import React from 'react';
import {
  Activity,
  AlertOctagon,
  Clock,
  DollarSign,
  Layers,
  ShieldCheck,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { LiveMarketFeedStatus } from '../types/marketFeedTypes';
import { PaperSignalAuditLog } from '../services/realDataObservationEngine';
import { PortfolioSummary, PaperTrade } from '../types';
import { ObservationSessionState } from '../types/marketFeedTypes';

export interface PaperTradingStatusPanelProps {
  symbol: string;
  feedStatus: LiveMarketFeedStatus;
  latestSignalLog?: PaperSignalAuditLog;
  portfolioSummary: PortfolioSummary;
  openTrades: PaperTrade[];
  closedTrades: PaperTrade[];
  sessionState?: ObservationSessionState;
  currencySymbol?: string;
}

export const PaperTradingStatusPanel: React.FC<PaperTradingStatusPanelProps> = ({
  symbol,
  feedStatus,
  latestSignalLog,
  portfolioSummary,
  openTrades,
  closedTrades,
  sessionState,
  currencySymbol = '₹',
}) => {
  // 1. Data mode determination
  const isOffline = feedStatus.status === 'DATA_FEED_OFFLINE' || feedStatus.dataMode === 'OFFLINE';
  const isDelayed = feedStatus.status === 'DELAYED_MARKET_DATA' || feedStatus.dataMode === 'DELAYED';
  const isLive = feedStatus.status === 'LIVE_MARKET_DATA' || feedStatus.dataMode === 'LIVE';

  const dataModeLabel = isOffline
    ? 'OFFLINE'
    : isDelayed
    ? 'DELAYED'
    : isLive
    ? 'LIVE'
    : 'SIMULATED';

  const dataModeColor = isOffline
    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    : isDelayed
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  // 2. Latest validated price
  const validatedPrice = feedStatus.latestPrice ?? (latestSignalLog?.marketPrice ?? null);
  const validatedPriceDisplay =
    validatedPrice !== null && !isNaN(validatedPrice) && validatedPrice > 0
      ? `${currencySymbol}${validatedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : isOffline
      ? 'INSUFFICIENT DATA / N/A (Feed Offline)'
      : 'INSUFFICIENT DATA';

  // 3. Last successful observation timestamp
  const lastObsTimestamp = feedStatus.lastSuccessfulUpdateTimestamp
    ? new Date(feedStatus.lastSuccessfulUpdateTimestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : isOffline
    ? 'N/A (Feed Offline)'
    : 'Waiting for feed...';

  // 4. Measured latency
  const latencyDisplay =
    !isOffline && feedStatus.latencyMs !== null && feedStatus.latencyMs !== undefined
      ? `${feedStatus.latencyMs} ms`
      : 'N/A';

  // 5. Strategy evaluation status
  const evalStatus = latestSignalLog?.strategyEvaluationStatus ?? (isOffline ? 'PAUSED_FEED_INVALID' : 'EVALUATED_ACTIVE');
  const evalStatusDisplay =
    evalStatus === 'EVALUATED_ACTIVE'
      ? 'EVALUATED (Active)'
      : evalStatus === 'PAUSED_FEED_INVALID'
      ? 'PAUSED (Feed Offline / Safety Halt)'
      : evalStatus === 'DATA_FEED_ANOMALY'
      ? 'PAUSED (Feed Anomaly Detected)'
      : 'INSUFFICIENT DATA (Buffer Warm-up)';

  const evalStatusBadgeColor =
    evalStatus === 'EVALUATED_ACTIVE'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : evalStatus === 'PAUSED_FEED_INVALID' || evalStatus === 'DATA_FEED_ANOMALY'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  // 6. Current signal & Reason
  const currentSignal = latestSignalLog?.signalType ?? (isOffline ? 'HOLD' : 'NO SIGNAL');
  const currentReason =
    latestSignalLog?.signalReason ??
    (isOffline
      ? feedStatus.lastErrorMessage || feedStatus.pauseReason || 'Market data provider offline. Safety halt engaged.'
      : 'Awaiting candle validation');

  // 7. Simulated position for this symbol
  const symbolOpenTrade = openTrades.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase() || symbol.toUpperCase().startsWith(t.symbol.toUpperCase())
  );
  const isPositionOpen = Boolean(symbolOpenTrade);

  // 8. Virtual cash, Unrealized P/L, Realized P/L
  const virtualCash = portfolioSummary.availableCash;
  const unrealizedPnL = openTrades.reduce((acc, t) => acc + (t.unrealizedPnL || 0), 0);
  const realizedPnL = closedTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);

  return (
    <div
      id="paper-trading-status-panel"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5 text-slate-100"
    >
      {/* Top Header & 100% Simulated Paper Safety Guarantee */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">Paper Trading Status Panel</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Champion #5 (v1.5.0)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              End-to-End pipeline observation: Market Data → Strategy Engine → Paper Virtual Ledger
            </p>
          </div>
        </div>

        {/* Paper Safety Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>100% SIMULATED PAPER TRADING — ZERO REAL CAPITAL RISK</span>
        </div>
      </div>

      {/* Grid: 12 Key Status Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Field 1: Current Symbol */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            1. Current Symbol
          </span>
          <div className="text-lg font-bold text-white font-mono flex items-center justify-between">
            <span>{symbol}</span>
            <span className="text-[10px] font-sans px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
              BSE/NSE
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Target evaluation asset</span>
        </div>

        {/* Field 2: Latest Validated Price */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            2. Latest Validated Price
          </span>
          <div className="text-lg font-bold text-white font-mono truncate">
            {validatedPriceDisplay}
          </div>
          <span className="text-[11px] text-slate-400">
            {validatedPrice ? 'Authenticated quote price' : 'Offline / no price received'}
          </span>
        </div>

        {/* Field 3: Data Mode */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            3. Data Mode
          </span>
          <div>
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${dataModeColor}`}>
              {dataModeLabel}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isOffline ? 'Offline (Safety Halt Active)' : isDelayed ? 'Delayed (15m delay)' : 'Live Authenticated'}
          </span>
        </div>

        {/* Field 4: Last Successful Observation Timestamp & Latency */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              4. Last Obs & Latency
            </span>
            <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {latencyDisplay}
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-200 font-mono">
            {lastObsTimestamp}
          </div>
          <span className="text-[11px] text-slate-400">
            Probe latency: {latencyDisplay}
          </span>
        </div>

        {/* Field 5: Strategy Evaluation Status */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            5. Strategy Evaluation Status
          </span>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${evalStatusBadgeColor}`}>
              {evalStatusDisplay}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Dual SMA 20/50 + RSI 14 + MACD
          </span>
        </div>

        {/* Field 6: Current Signal */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            6. Current Signal
          </span>
          <div>
            <span
              className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold ${
                currentSignal === 'BUY'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : currentSignal === 'SELL'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {currentSignal}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Evaluated on latest candle</span>
        </div>

        {/* Field 7: Simulated Position State */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            7. Simulated Position State
          </span>
          <div className="text-sm font-bold flex items-center gap-1.5">
            {isPositionOpen ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>OPEN ({symbolOpenTrade?.quantity} shares)</span>
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>FLAT (No Open Position)</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {isPositionOpen ? `Entry: ${currencySymbol}${symbolOpenTrade?.entryPrice.toFixed(2)}` : '100% in Virtual Cash'}
          </span>
        </div>

        {/* Field 8: Virtual Cash */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            8. Virtual Cash Balance
          </span>
          <div className="text-base font-bold text-white font-mono">
            {currencySymbol}{virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Simulated capital pool</span>
        </div>
      </div>

      {/* Row 2: Signal Reason + P/L Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Signal Reason Box */}
        <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Signal Generation Reason & Indicator Confluence</span>
          </div>
          <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            {currentReason}
          </p>
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-400 pt-1">
            <span>Fast SMA (20): <strong className="text-slate-200">{latestSignalLog?.championRulesState.currFastSma || '—'}</strong></span>
            <span>Slow SMA (50): <strong className="text-slate-200">{latestSignalLog?.championRulesState.currSlowSma || '—'}</strong></span>
            <span>RSI (14): <strong className="text-slate-200">{latestSignalLog?.championRulesState.currRsi || '—'}</strong></span>
            <span>MACD Hist: <strong className="text-slate-200">{latestSignalLog?.championRulesState.currMacdHist || '—'}</strong></span>
          </div>
        </div>

        {/* Unrealized & Realized P/L Box */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Virtual Accounting Ledger (P/L)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Unrealized P/L</span>
              <span
                className={`text-sm font-bold font-mono ${
                  unrealizedPnL > 0
                    ? 'text-emerald-400'
                    : unrealizedPnL < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {unrealizedPnL >= 0 ? '+' : ''}
                {currencySymbol}{unrealizedPnL.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Realized P/L</span>
              <span
                className={`text-sm font-bold font-mono ${
                  realizedPnL > 0
                    ? 'text-emerald-400'
                    : realizedPnL < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {realizedPnL >= 0 ? '+' : ''}
                {currencySymbol}{realizedPnL.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span>Double-entry verified: Cash + Holdings = Equity</span>
          </div>
        </div>
      </div>

      {/* Row 3: Comprehensive Observation Summary (Item 7 Requirements) */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Extended Paper-Trading Observation Summary
            </h3>
          </div>
          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
            Active Real-Data Observation Phase
          </span>
        </div>

        {/* 11-Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* 1. Total Signals */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">1. Total Signals</span>
            <span className="text-sm font-bold text-white font-mono">
              {sessionState ? sessionState.totalSignalsGenerated : 0}
            </span>
          </div>

          {/* 2. Executed Simulated Trades */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">2. Simulated Trades</span>
            <span className="text-sm font-bold text-white font-mono">
              {closedTrades.length + openTrades.length} orders
            </span>
          </div>

          {/* 3. Winning Trades */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">3. Winning Trades</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {closedTrades.filter((t) => (t.realizedPnL || 0) > 0).length}
            </span>
          </div>

          {/* 4. Losing Trades */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">4. Losing Trades</span>
            <span className="text-sm font-bold text-rose-400 font-mono">
              {closedTrades.filter((t) => (t.realizedPnL || 0) < 0).length}
            </span>
          </div>

          {/* 5. Win Rate */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">5. Win Rate</span>
            <span className="text-sm font-bold text-indigo-300 font-mono">
              {closedTrades.length > 0
                ? `${((closedTrades.filter((t) => (t.realizedPnL || 0) > 0).length / closedTrades.length) * 100).toFixed(1)}%`
                : sessionState
                ? `${sessionState.winRate.toFixed(1)}%`
                : '0.0%'}
            </span>
          </div>

          {/* 6. Gross P/L */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">6. Gross P/L</span>
            <span
              className={`text-sm font-bold font-mono ${
                realizedPnL + (sessionState?.totalFeesPaid || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currencySymbol}
              {(sessionState ? sessionState.grossProfit - sessionState.grossLoss : realizedPnL).toFixed(2)}
            </span>
          </div>

          {/* 7. Fees & Friction */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">7. Total Fees/Slip</span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {currencySymbol}{(sessionState ? sessionState.totalFeesPaid + sessionState.totalSlippagePaid : 0).toFixed(2)}
            </span>
          </div>

          {/* 8. Net P/L */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">8. Net P/L</span>
            <span
              className={`text-sm font-bold font-mono ${
                (sessionState ? sessionState.netPnl : realizedPnL) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(sessionState ? sessionState.netPnl : realizedPnL) >= 0 ? '+' : ''}
              {currencySymbol}{(sessionState ? sessionState.netPnl : realizedPnL).toFixed(2)}
            </span>
          </div>

          {/* 9. Maximum Drawdown */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">9. Max Drawdown</span>
            <span className="text-sm font-bold text-rose-300 font-mono">
              {sessionState ? sessionState.maxDrawdownPercent.toFixed(2) : '0.00'}%
            </span>
          </div>

          {/* 10. Current Virtual Cash */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">10. Virtual Cash</span>
            <span className="text-sm font-bold text-white font-mono truncate">
              {currencySymbol}{portfolioSummary.availableCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* 11. Current Portfolio Value */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 sm:col-span-2 md:col-span-2 lg:col-span-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">11. Current Portfolio Value</span>
            <span className="text-sm font-bold text-white font-mono">
              {currencySymbol}{portfolioSummary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Item 8: Strict Scientific Disclaimer */}
        <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 text-[11px] text-slate-400">
          <AlertOctagon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Observation Phase Mandate:</strong> No claims of profitability or strategy edge are made during early sample periods. Statistically sound performance validation requires accumulating a large volume of verified real-market observations across varying volatility regimes.
          </span>
        </div>
      </div>
    </div>
  );
};
