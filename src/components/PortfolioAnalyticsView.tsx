import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  LineChart as LineChartIcon,
  ShieldAlert,
  Award,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  XCircle,
  Percent,
  Wallet,
  Activity,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PortfolioAnalytics, PortfolioSnapshot } from '../types';
import { NavTab } from './Navbar';

interface PortfolioAnalyticsViewProps {
  analytics: PortfolioAnalytics;
  snapshots: PortfolioSnapshot[];
  currencySymbol: string;
  onNavigate: (tab: NavTab) => void;
  onResetPortfolio: () => void;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const PortfolioAnalyticsView: React.FC<PortfolioAnalyticsViewProps> = ({
  analytics,
  snapshots,
  currencySymbol,
  onNavigate,
  onResetPortfolio,
}) => {
  const formatCurrency = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const formatted = `${currencySymbol}${absVal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    return isNeg ? `-${formatted}` : formatted;
  };

  const isTotalProfit = analytics.totalReturn >= 0;
  const isRealizedProfit = analytics.realizedPnL >= 0;
  const isUnrealizedProfit = analytics.unrealizedPnL >= 0;

  // Prepare allocation data for Pie chart
  const allocationPieData = analytics.holdingsAllocation.map((h) => ({
    name: h.symbol,
    value: h.currentValue,
    percent: h.portfolioPercent,
  }));

  if (analytics.cashAllocationPercent > 0) {
    allocationPieData.push({
      name: 'Virtual Cash',
      value: analytics.availableCash,
      percent: analytics.cashAllocationPercent,
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              <span>Portfolio Analytics & Performance</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
              Live Local State
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time equity breakdown, trade performance statistics, and risk concentration metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('paper-trading')}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Place Order</span>
          </button>
          <button
            onClick={onResetPortfolio}
            className="px-3.5 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-bold rounded-xl transition-all"
          >
            Reset Portfolio
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Portfolio Value */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Account Value</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatCurrency(analytics.totalPortfolioValue)}
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded ${
                isTotalProfit
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isTotalProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>
                {isTotalProfit ? '+' : ''}
                {analytics.totalReturnPercent}% Total Return
              </span>
            </span>
          </div>
        </div>

        {/* Card 2: Cash vs Invested */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Capital Allocation</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {formatCurrency(analytics.totalInvested)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Cash: {formatCurrency(analytics.availableCash)}</span>
            <span className="text-slate-500">({analytics.cashAllocationPercent}% Liquidity)</span>
          </div>
        </div>

        {/* Card 3: Realized P/L */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Realized P/L</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`text-2xl font-black ${
              isRealizedProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isRealizedProfit && analytics.realizedPnL > 0 ? '+' : ''}
            {formatCurrency(analytics.realizedPnL)}
          </div>
          <span className="text-xs text-slate-500 block">
            From {analytics.closedTradesCount} closed trade(s)
          </span>
        </div>

        {/* Card 4: Unrealized P/L */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Unrealized P/L</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`text-2xl font-black ${
              isUnrealizedProfit && analytics.unrealizedPnL !== 0
                ? isUnrealizedProfit
                  ? 'text-emerald-400'
                  : 'text-rose-400'
                : 'text-slate-200'
            }`}
          >
            {isUnrealizedProfit && analytics.unrealizedPnL > 0 ? '+' : ''}
            {formatCurrency(analytics.unrealizedPnL)}
          </div>
          <span className="text-xs text-slate-500 block">
            Across {analytics.openPositionsCount} active position(s)
          </span>
        </div>
      </div>

      {/* 3. P/L Breakdown Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <span>P/L Structure & Profitability Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict separation between closed realized gains and open active paper float
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Combined Net P/L</span>
            <span
              className={`text-base font-black ${
                analytics.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analytics.totalPnL >= 0 ? '+' : ''}
              {formatCurrency(analytics.totalPnL)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase block">1. Realized P/L</span>
            <div
              className={`text-xl font-black ${
                analytics.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analytics.realizedPnL >= 0 ? '+' : ''}
              {formatCurrency(analytics.realizedPnL)}
            </div>
            <p className="text-[11px] text-slate-500">
              Locked profit/loss from fully or partially closed paper positions.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase block">2. Unrealized P/L</span>
            <div
              className={`text-xl font-black ${
                analytics.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analytics.unrealizedPnL >= 0 ? '+' : ''}
              {formatCurrency(analytics.unrealizedPnL)}
            </div>
            <p className="text-[11px] text-slate-500">
              Paper fluctuation on currently open holdings based on live market quotes.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase block">3. Today's Day Change</span>
            <div
              className={`text-xl font-black ${
                analytics.todayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analytics.todayPnL >= 0 ? '+' : ''}
              {formatCurrency(analytics.todayPnL)}
            </div>
            <p className="text-[11px] text-slate-500">
              Estimated single-session price fluctuation for active open positions.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Portfolio Performance Chart over Time */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LineChartIcon className="w-4 h-4 text-emerald-400" />
              <span>Portfolio Performance History</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Track equity trajectory relative to the {formatCurrency(analytics.initialCapital)} initial capital baseline
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Snapshot Tracking: Active ({snapshots.length} Data Points)
          </span>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={snapshots}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `${currencySymbol}${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as PortfolioSnapshot;
                    const diff = data.totalValue - analytics.initialCapital;
                    return (
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1.5 shadow-2xl">
                        <div className="text-slate-400 font-medium">{data.timeLabel}</div>
                        <div className="text-white font-black text-sm">
                          Portfolio: {formatCurrency(data.totalValue)}
                        </div>
                        <div className="text-slate-400 text-[11px] space-y-0.5">
                          <div>Available Cash: {formatCurrency(data.availableCash)}</div>
                          <div>Invested Equity: {formatCurrency(data.investedAmount)}</div>
                          <div
                            className={`font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                          >
                            Return: {diff >= 0 ? '+' : ''}
                            {formatCurrency(diff)}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={analytics.initialCapital}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: 'Initial Capital (₹1L)',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Asset Allocation Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="pb-2 border-b border-slate-800">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <span>Asset Allocation Breakdown</span>
            </h4>
            <p className="text-xs text-slate-400">Equity holdings vs cash liquidity ratio</p>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {allocationPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0];
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1 shadow-xl">
                          <div className="font-semibold text-slate-200">{d.name}</div>
                          <div className="text-emerald-400 font-bold">
                            {formatCurrency(Number(d.value))}
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            {d.payload.percent}% of Portfolio
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Holdings Allocation Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Active Holdings Distribution</h3>
            <span className="text-xs text-slate-400 font-semibold">
              {analytics.holdingsAllocation.length} Unique Asset(s)
            </span>
          </div>

          {analytics.holdingsAllocation.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs text-slate-400">No active stock positions in paper portfolio.</p>
              <button
                onClick={() => onNavigate('paper-trading')}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30"
              >
                + Place Paper Trade
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Current Value</th>
                    <th className="py-2.5 px-3">Unrealized P/L</th>
                    <th className="py-2.5 px-3">% Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {analytics.holdingsAllocation.map((h) => {
                    const isWin = h.unrealizedPnL >= 0;
                    return (
                      <tr key={h.symbol} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-white">{h.symbol}</td>
                        <td className="py-3 px-3 text-slate-400">{h.stockName}</td>
                        <td className="py-3 px-3 font-semibold">{h.quantity}</td>
                        <td className="py-3 px-3 font-bold text-white">{formatCurrency(h.currentValue)}</td>
                        <td className={`py-3 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}{formatCurrency(h.unrealizedPnL)} ({isWin ? '+' : ''}{h.unrealizedPnLPercent}%)
                        </td>
                        <td className="py-3 px-3 font-bold text-sky-400">{h.portfolioPercent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 6. Best & Worst Performers */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Best & Worst Performers Analysis</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Derived directly from active holdings float and completed paper trade records
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Best Holding */}
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block tracking-wider">
              Best Active Holding
            </span>
            {analytics.bestHolding ? (
              <div>
                <div className="text-base font-black text-white">{analytics.bestHolding.symbol}</div>
                <div className="text-xs text-slate-400 truncate">{analytics.bestHolding.stockName}</div>
                <div className="text-sm font-black text-emerald-400 mt-1">
                  +{formatCurrency(analytics.bestHolding.unrealizedPnL)} (+{analytics.bestHolding.unrealizedPnLPercent}%)
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 block py-2">No active holdings</span>
            )}
          </div>

          {/* Worst Holding */}
          <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-rose-400 block tracking-wider">
              Worst Active Holding
            </span>
            {analytics.worstHolding ? (
              <div>
                <div className="text-base font-black text-white">{analytics.worstHolding.symbol}</div>
                <div className="text-xs text-slate-400 truncate">{analytics.worstHolding.stockName}</div>
                <div
                  className={`text-sm font-black mt-1 ${
                    analytics.worstHolding.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {analytics.worstHolding.unrealizedPnL >= 0 ? '+' : ''}
                  {formatCurrency(analytics.worstHolding.unrealizedPnL)} ({analytics.worstHolding.unrealizedPnLPercent}%)
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 block py-2">No active holdings</span>
            )}
          </div>

          {/* Best Closed Trade */}
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block tracking-wider">
              Best Completed Trade
            </span>
            {analytics.bestClosedTrade ? (
              <div>
                <div className="text-base font-black text-white">{analytics.bestClosedTrade.symbol}</div>
                <div className="text-xs text-slate-400 truncate">{analytics.bestClosedTrade.stockName}</div>
                <div className="text-sm font-black text-emerald-400 mt-1">
                  +{formatCurrency(analytics.bestClosedTrade.realizedPnL)} (+{analytics.bestClosedTrade.realizedPnLPercent}%)
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 block py-2">No profitable closed trades</span>
            )}
          </div>

          {/* Worst Closed Trade */}
          <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-rose-400 block tracking-wider">
              Worst Completed Trade
            </span>
            {analytics.worstClosedTrade ? (
              <div>
                <div className="text-base font-black text-white">{analytics.worstClosedTrade.symbol}</div>
                <div className="text-xs text-slate-400 truncate">{analytics.worstClosedTrade.stockName}</div>
                <div className="text-sm font-black text-rose-400 mt-1">
                  {formatCurrency(analytics.worstClosedTrade.realizedPnL)} ({analytics.worstClosedTrade.realizedPnLPercent}%)
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 block py-2">No losing closed trades</span>
            )}
          </div>
        </div>
      </div>

      {/* 7. Trade Statistics Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Comprehensive Trade Execution Statistics</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Closed trade stats, win rate, and win/loss expectation metrics
            </p>
          </div>
          <button
            onClick={() => onNavigate('trade-history')}
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            View Full History →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Orders</span>
            <span className="text-lg font-black text-white">{analytics.totalTradesCount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {analytics.buyOrdersCount} Buys / {analytics.sellOrdersCount} Sells
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Win Rate</span>
            <span
              className={`text-lg font-black ${
                analytics.winRatePercent >= 50 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {analytics.winRatePercent}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {analytics.winningClosedTradesCount} W / {analytics.losingClosedTradesCount} L
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Avg Win Trade</span>
            <span className="text-lg font-black text-emerald-400">
              {formatCurrency(analytics.avgWinningTrade)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Per winning trade</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Avg Loss Trade</span>
            <span className="text-lg font-black text-rose-400">
              {formatCurrency(analytics.avgLosingTrade)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Per losing trade</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Largest Profit / Loss</span>
            <div className="text-xs font-bold space-y-0.5 mt-1">
              <span className="text-emerald-400 block">+{formatCurrency(analytics.largestProfit)}</span>
              <span className="text-rose-400 block">{formatCurrency(analytics.largestLoss)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Educational Risk & Concentration Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Risk Exposure & Concentration Summary</span>
          </h3>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded border ${
              analytics.concentrationLevel === 'Low Concentration'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : analytics.concentrationLevel === 'Moderate Concentration'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {analytics.concentrationLevel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300">Portfolio Weight Distribution</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Cash Reserve Liquidity:</span>
                <span className="font-bold text-emerald-400">{analytics.cashAllocationPercent}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, analytics.cashAllocationPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-slate-400 pt-1">
                <span>Invested Equity Allocation:</span>
                <span className="font-bold text-sky-400">{analytics.investedAllocationPercent}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, analytics.investedAllocationPercent)}%` }}
                />
              </div>

              {analytics.largestPositionSymbol && (
                <div className="flex items-center justify-between text-slate-400 pt-1">
                  <span>Largest Single Holding ({analytics.largestPositionSymbol}):</span>
                  <span className="font-bold text-amber-400">{analytics.largestPositionPercent}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Diversification Assessment</span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                {analytics.diversificationStatus}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 leading-relaxed italic">
              Disclaimer: TradeAI by PMK is an educational simulation platform for paper trading practice. All metrics and indicators are purely educational tools and do not constitute investment advice or guaranteed future performance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
