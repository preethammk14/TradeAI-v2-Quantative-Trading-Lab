import React, { useEffect, useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  Layers,
  Award,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Search,
} from 'lucide-react';
import { StockQuote, PortfolioSummary, PaperTrade, AiMarketSummaryResult } from '../types';
import { StockSparkline } from '../components/StockSparkline';
import { DemoDataBadge } from '../components/DemoDataBadge';
import { geminiService } from '../services/geminiService';
import { NavTab } from '../components/Navbar';

interface DashboardPageProps {
  quotes: StockQuote[];
  portfolioSummary: PortfolioSummary;
  recentTrades: PaperTrade[];
  currencySymbol: string;
  onSelectStock: (symbol: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  quotes,
  portfolioSummary,
  recentTrades,
  currencySymbol,
  onSelectStock,
  onNavigate,
}) => {
  const [marketSummary, setMarketSummary] = useState<AiMarketSummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchSummary = async (forceRefresh = false) => {
    setLoadingSummary(true);
    try {
      const summary = await geminiService.getMarketSummary(quotes, forceRefresh);
      setMarketSummary(summary);
    } catch (e) {
      console.error('Failed to fetch market summary:', e);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const mainStocks = quotes.slice(0, 6); // AAPL, MSFT, NVDA, AMZN, TSLA, GOOGL

  const sortedByGain = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
  const topGainers = sortedByGain.slice(0, 3);
  const topDecliners = [...sortedByGain].reverse().slice(0, 3);

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Warning & Mode Indicator */}
      <DemoDataBadge />

      {/* Hero Welcome & Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Portfolio Value
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {formatCurrency(portfolioSummary.totalValue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-slate-400">Virtual Cash:</span>
            <span className="font-semibold text-slate-200">{formatCurrency(portfolioSummary.availableCash)}</span>
          </div>
        </div>

        {/* Overall P/L */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overall P/L
            </span>
            <div
              className={`p-2 rounded-xl ${
                portfolioSummary.overallPnL >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {portfolioSummary.overallPnL >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              portfolioSummary.overallPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {portfolioSummary.overallPnL >= 0 ? '+' : ''}
            {formatCurrency(portfolioSummary.overallPnL)}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <span
              className={`font-bold ${
                portfolioSummary.overallPnLPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {portfolioSummary.overallPnLPercent >= 0 ? '+' : ''}
              {portfolioSummary.overallPnLPercent}%
            </span>
            <span className="text-slate-500">since inception</span>
          </div>
        </div>

        {/* Today's P/L */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's P/L
            </span>
            <div
              className={`p-2 rounded-xl ${
                portfolioSummary.todayPnL >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              portfolioSummary.todayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {portfolioSummary.todayPnL >= 0 ? '+' : ''}
            {formatCurrency(portfolioSummary.todayPnL)}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
            <span>Invested:</span>
            <span className="font-semibold text-slate-200">{formatCurrency(portfolioSummary.investedAmount)}</span>
          </div>
        </div>

        {/* Win Rate & Open Positions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Win Rate & Positions
            </span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{portfolioSummary.winRate}%</span>
            <span className="text-xs text-slate-400 font-medium">Win Rate</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Open Positions: <strong className="text-emerald-400">{portfolioSummary.openPositionsCount}</strong></span>
            <span>Total Trades: <strong className="text-white">{portfolioSummary.totalTradesCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Market Cards + AI Executive Market Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Overview Stock Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Key Benchmark Equities</span>
            </h2>
            <button
              onClick={() => onNavigate('explorer')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore All Markets</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mainStocks.map((stock) => {
              const isPositive = stock.changePercent >= 0;
              return (
                <div
                  key={stock.symbol}
                  onClick={() => {
                    onSelectStock(stock.symbol);
                    onNavigate('explorer');
                  }}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 shadow-lg cursor-pointer hover:scale-[1.02] transition-all space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-black text-base text-white group-hover:text-emerald-400 transition-colors">
                        {stock.symbol}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[110px]">
                        {stock.name}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      {stock.marketStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-lg font-black text-white">
                        {formatCurrency(stock.price)}
                      </div>
                      <div
                        className={`text-xs font-bold flex items-center ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5 inline mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 inline mr-0.5" />
                        )}
                        {isPositive ? '+' : ''}
                        {stock.changePercent}% ({isPositive ? '+' : ''}
                        {stock.change.toFixed(2)})
                      </div>
                    </div>

                    <StockSparkline data={stock.sparkline} isPositive={isPositive} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStock(stock.symbol);
                        onNavigate('ai-analyst');
                      }}
                      className="text-amber-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <BrainCircuit className="w-3 h-3" />
                      <span>AI Analyze</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStock(stock.symbol);
                        onNavigate('paper-trading');
                      }}
                      className="text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Paper Trade</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Market Summary Panel (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Executive Market Summary</h3>
                  <p className="text-[11px] text-slate-400">Powered by Gemini 3.6 Flash</p>
                </div>
              </div>
              <button
                onClick={() => fetchSummary(true)}
                disabled={loadingSummary}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all"
                title="Refresh AI market summary"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            {marketSummary?.isFallback && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center justify-between">
                <span>{marketSummary.fallbackNotice || 'Showing deterministic demo market summary'}</span>
                <span className="font-bold text-[10px] uppercase tracking-wide bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">DEMO FALLBACK</span>
              </div>
            )}

            {loadingSummary ? (
              <div className="py-12 text-center space-y-3">
                <BrainCircuit className="w-8 h-8 text-emerald-400 animate-pulse mx-auto" />
                <p className="text-xs text-slate-400">Synthesizing real-time market sentiment & technical observations...</p>
              </div>
            ) : marketSummary ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-medium">Overall Sentiment:</span>
                  <span
                    className={`font-black tracking-wider uppercase px-2.5 py-0.5 rounded text-[11px] ${
                      marketSummary.overallSentiment === 'BULLISH'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : marketSummary.overallSentiment === 'BEARISH'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {marketSummary.overallSentiment} ({marketSummary.sentimentScore}%)
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {marketSummary.summaryParagraph}
                </p>

                <div className="space-y-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    Key Technical Observations:
                  </span>
                  <ul className="space-y-1 pl-1">
                    {marketSummary.keyObservations.slice(0, 3).map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Insufficient current market data for analysis.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Generated at: {marketSummary?.generatedAt || 'Just now'}</span>
            <span className="text-emerald-400 font-semibold">Educational Model</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Gainers/Decliners + Recent Paper Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Gainers & Decliners */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Market Momentum Leaders</span>
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Top Gainers
              </span>
              <div className="mt-1 space-y-2">
                {topGainers.map((g) => (
                  <div
                    key={g.symbol}
                    onClick={() => {
                      onSelectStock(g.symbol);
                      onNavigate('explorer');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 cursor-pointer border border-slate-800 transition-all text-xs"
                  >
                    <div>
                      <span className="font-bold text-white mr-2">{g.symbol}</span>
                      <span className="text-slate-400">{formatCurrency(g.price)}</span>
                    </div>
                    <span className="font-bold text-emerald-400">+{g.changePercent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                Top Decliners
              </span>
              <div className="mt-1 space-y-2">
                {topDecliners.map((d) => (
                  <div
                    key={d.symbol}
                    onClick={() => {
                      onSelectStock(d.symbol);
                      onNavigate('explorer');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 cursor-pointer border border-slate-800 transition-all text-xs"
                  >
                    <div>
                      <span className="font-bold text-white mr-2">{d.symbol}</span>
                      <span className="text-slate-400">{formatCurrency(d.price)}</span>
                    </div>
                    <span className="font-bold text-rose-400">{d.changePercent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Paper Trades Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Recent Paper Trades</span>
            </h3>
            <button
              onClick={() => onNavigate('trade-history')}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              View Full History →
            </button>
          </div>

          {recentTrades.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400">No paper trades executed yet.</p>
              <button
                onClick={() => onNavigate('paper-trading')}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all"
              >
                Place First Paper Trade
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Entry Price</th>
                    <th className="py-2.5 px-3">Current/Exit</th>
                    <th className="py-2.5 px-3">P/L</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentTrades.slice(0, 5).map((trade) => {
                    const pnl = trade.status === 'OPEN' ? trade.unrealizedPnL : trade.realizedPnL || 0;
                    const pnlPercent = trade.status === 'OPEN' ? trade.unrealizedPnLPercent : trade.realizedPnLPercent || 0;
                    const isWin = pnl >= 0;

                    return (
                      <tr key={trade.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-white">{trade.symbol}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trade.action === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {trade.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">{trade.quantity}</td>
                        <td className="py-2.5 px-3">{formatCurrency(trade.entryPrice)}</td>
                        <td className="py-2.5 px-3">
                          {formatCurrency(trade.status === 'OPEN' ? trade.currentPrice : trade.exitPrice || 0)}
                        </td>
                        <td className={`py-2.5 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}{formatCurrency(pnl)} ({isWin ? '+' : ''}{pnlPercent}%)
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              trade.status === 'OPEN'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {trade.status}
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
    </div>
  );
};
