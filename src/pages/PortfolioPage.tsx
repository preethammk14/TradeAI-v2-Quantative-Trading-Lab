import React, { useState } from 'react';
import { PieChart, Wallet, DollarSign, TrendingUp, TrendingDown, BarChart3, ListFilter } from 'lucide-react';
import { PortfolioSummary, PaperTrade, StockQuote } from '../types';
import { AllocationChart } from '../components/AllocationChart';
import { DemoDataBadge } from '../components/DemoDataBadge';
import { PortfolioAnalyticsView } from '../components/PortfolioAnalyticsView';
import { paperTradingService } from '../services/paperTradingService';
import { NavTab } from '../components/Navbar';

interface PortfolioPageProps {
  portfolioSummary: PortfolioSummary;
  openTrades: PaperTrade[];
  quotes?: StockQuote[];
  currencySymbol: string;
  onTradeExecuted: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({
  portfolioSummary,
  openTrades,
  quotes = [],
  currencySymbol,
  onTradeExecuted,
  onNavigate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'overview'>('analytics');

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const { analytics, snapshots } = paperTradingService.getPortfolioAnalytics(quotes);

  const handleCloseAll = () => {
    if (confirm('Are you sure you want to close all open paper positions at current market prices?')) {
      openTrades.forEach((t) => {
        paperTradingService.closePosition(t.id, t.currentPrice);
      });
      onTradeExecuted();
    }
  };

  const handleResetPortfolio = () => {
    if (
      window.confirm(
        'WARNING: Are you sure you want to reset your paper trading portfolio? All active holdings and trade history will be permanently erased, and your virtual capital will be restored to ₹1,00,000.'
      )
    ) {
      paperTradingService.resetPortfolio();
      onTradeExecuted();
    }
  };

  return (
    <div className="space-y-6">
      <DemoDataBadge />

      {/* Sub-Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-2 max-w-fit shadow-lg">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'analytics'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Portfolio Analytics & Stats</span>
        </button>

        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'overview'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Holdings Overview</span>
        </button>
      </div>

      {activeSubTab === 'analytics' ? (
        <PortfolioAnalyticsView
          analytics={analytics}
          snapshots={snapshots}
          currencySymbol={currencySymbol}
          onNavigate={onNavigate}
          onResetPortfolio={handleResetPortfolio}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <PieChart className="w-6 h-6 text-emerald-400" />
                <span>Virtual Portfolio Overview</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time equity distribution, asset allocation pie breakdown, and open position management
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {openTrades.length > 0 && (
                <button
                  onClick={handleCloseAll}
                  className="px-4 py-2 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold rounded-xl transition-all"
                >
                  Liquidate All Positions
                </button>
              )}

              <button
                onClick={handleResetPortfolio}
                className="px-4 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-bold rounded-xl transition-all"
              >
                Reset Paper Portfolio
              </button>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Account Value
              </span>
              <div className="text-2xl font-black text-white">
                {formatCurrency(portfolioSummary.totalValue)}
              </div>
              <span className="text-xs text-slate-500 block">
                Initial Capital: {formatCurrency(portfolioSummary.virtualBalance)}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Available Cash
              </span>
              <div className="text-2xl font-black text-emerald-400">
                {formatCurrency(portfolioSummary.availableCash)}
              </div>
              <span className="text-xs text-slate-500 block">
                {portfolioSummary.totalValue > 0
                  ? ((portfolioSummary.availableCash / portfolioSummary.totalValue) * 100).toFixed(1)
                  : '100'}% Cash Liquidity
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Invested Equity Value
              </span>
              <div className="text-2xl font-black text-sky-400">
                {formatCurrency(portfolioSummary.investedAmount)}
              </div>
              <span className="text-xs text-slate-500 block">
                {portfolioSummary.openPositionsCount} Open Positions
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Overall Portfolio P/L
              </span>
              <div
                className={`text-2xl font-black ${
                  portfolioSummary.overallPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {portfolioSummary.overallPnL >= 0 ? '+' : ''}
                {formatCurrency(portfolioSummary.overallPnL)}
              </div>
              <span
                className={`text-xs font-bold block ${
                  portfolioSummary.overallPnLPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {portfolioSummary.overallPnLPercent >= 0 ? '+' : ''}
                {portfolioSummary.overallPnLPercent}%
              </span>
            </div>
          </div>

          {/* Main Grid: Allocation Chart + Holdings List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AllocationChart
              openTrades={openTrades}
              availableCash={portfolioSummary.availableCash}
              currencySymbol={currencySymbol}
            />

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">Current Asset Holdings</h3>
                <button
                  onClick={() => onNavigate('paper-trading')}
                  className="text-xs font-semibold text-emerald-400 hover:underline"
                >
                  + Place Paper Order
                </button>
              </div>

              {openTrades.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No active holdings in your paper portfolio.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-3">Shares</th>
                        <th className="py-2.5 px-3">Avg Cost</th>
                        <th className="py-2.5 px-3">Current Price</th>
                        <th className="py-2.5 px-3">Total Value</th>
                        <th className="py-2.5 px-3">Unrealized P/L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {openTrades.map((t) => {
                        const isWin = t.unrealizedPnL >= 0;
                        return (
                          <tr key={t.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-bold text-white">{t.symbol}</td>
                            <td className="py-3 px-3 font-semibold">{t.quantity}</td>
                            <td className="py-3 px-3">{formatCurrency(t.entryPrice)}</td>
                            <td className="py-3 px-3">{formatCurrency(t.currentPrice)}</td>
                            <td className="py-3 px-3 font-bold text-white">
                              {formatCurrency(t.currentValue)}
                            </td>
                            <td className={`py-3 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isWin ? '+' : ''}{formatCurrency(t.unrealizedPnL)} ({isWin ? '+' : ''}{t.unrealizedPnLPercent}%)
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
        </div>
      )}
    </div>
  );
};

