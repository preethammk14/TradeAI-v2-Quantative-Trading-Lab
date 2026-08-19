import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  PieChart,
  ShieldAlert,
  Award,
  Activity,
  BarChart3,
  Calculator,
} from 'lucide-react';

export interface PerformanceMetricsData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // 0 to 100
  grossPnL: number;
  brokerageTotal: number;
  regulatoryFeesTotal: number;
  slippageTotal: number;
  totalFees: number; // brokerage + fees + slippage
  netPnL: number;
  maxDrawdown: number; // percentage
  avgWinningTrade: number;
  avgLosingTrade: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  virtualCash: number;
  portfolioValue: number;
}

interface PerformanceMetricsCardProps {
  metrics: PerformanceMetricsData;
  currencySymbol: string;
}

export const PerformanceMetricsCard: React.FC<PerformanceMetricsCardProps> = ({
  metrics,
  currencySymbol,
}) => {
  const formatCurrency = (val: number) => {
    const sign = val < 0 ? '-' : '';
    const absVal = Math.abs(val);
    return `${sign}${currencySymbol}${absVal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isNetWin = metrics.netPnL >= 0;
  const isGrossWin = metrics.grossPnL >= 0;

  return (
    <div className="space-y-4">
      {/* 11 Primary Performance Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* 1. Total Trades */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">1. Total Trades</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-lg font-black text-white font-mono">{metrics.totalTrades}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Executed orders</p>
        </div>

        {/* 2. Winning Trades */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">2. Winning Trades</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-lg font-black text-emerald-400 font-mono">{metrics.winningTrades}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Realized &gt; 0</p>
        </div>

        {/* 3. Losing Trades */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">3. Losing Trades</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-lg font-black text-rose-400 font-mono">{metrics.losingTrades}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Realized &lt; 0</p>
        </div>

        {/* 4. Win Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">4. Win Rate</span>
            <Percent className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-lg font-black text-white font-mono">{metrics.winRate.toFixed(1)}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.winRate))}%` }}
            />
          </div>
        </div>

        {/* 5. Gross P/L */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">5. Gross P/L</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className={`text-lg font-black font-mono ${isGrossWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(metrics.grossPnL)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Before friction</p>
        </div>

        {/* 6. Total Fees & Slippage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">6. Total Fees</span>
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-lg font-black text-amber-300 font-mono">
            {formatCurrency(metrics.totalFees)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate" title="₹20 brokerage + 0.05% STT + 0.05% slip">
            Brokerage+STT+Slip
          </p>
        </div>

        {/* 7. Net P/L */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">7. Net P/L</span>
            <Award className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className={`text-lg font-black font-mono ${isNetWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(metrics.netPnL)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Post-friction net</p>
        </div>

        {/* 8. Maximum Drawdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">8. Max Drawdown</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-lg font-black text-rose-400 font-mono">
            {metrics.maxDrawdown.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Peak-to-trough</p>
        </div>

        {/* 9. Avg Winning Trade */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">9. Avg Win</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-lg font-black text-emerald-400 font-mono">
            {formatCurrency(metrics.avgWinningTrade)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Per win trade</p>
        </div>

        {/* 10. Avg Losing Trade */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">10. Avg Loss</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-lg font-black text-rose-400 font-mono">
            {formatCurrency(metrics.avgLosingTrade)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Per loss trade</p>
        </div>

        {/* 11. Profit Factor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">11. Profit Factor</span>
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-lg font-black text-white font-mono">
            {metrics.profitFactor === Infinity
              ? '∞'
              : isNaN(metrics.profitFactor) || metrics.profitFactor === 0
              ? '0.00'
              : metrics.profitFactor.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Gross Win / Loss</p>
        </div>

        {/* 12. Portfolio Capital Pool */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">12. Capital Pool</span>
            <PieChart className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono truncate">
            Cash: {formatCurrency(metrics.virtualCash)}
          </p>
          <p className="text-[10px] font-bold text-emerald-400 font-mono truncate mt-0.5">
            Total: {formatCurrency(metrics.portfolioValue)}
          </p>
        </div>
      </div>
    </div>
  );
};
