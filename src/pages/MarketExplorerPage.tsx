import React, { useState } from 'react';
import {
  Search,
  BrainCircuit,
  TrendingUp,
  BarChart2,
  Info,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { StockQuote, Timeframe } from '../types';
import { getStockBySymbol, MOCK_STOCKS } from '../data/mockStocks';
import { DemoDataBadge } from '../components/DemoDataBadge';
import { StockChart } from '../components/StockChart';
import { RsiChart } from '../components/RsiChart';
import { MacdChart } from '../components/MacdChart';
import { marketDataService } from '../services/marketDataService';
import { NavTab } from '../components/Navbar';

interface MarketExplorerPageProps {
  quotes: StockQuote[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  currencySymbol: string;
  onNavigate: (tab: NavTab) => void;
}

export const MarketExplorerPage: React.FC<MarketExplorerPageProps> = ({
  quotes,
  selectedSymbol,
  onSelectStock,
  currencySymbol,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');

  const currentStock =
    quotes.find((q) => q.symbol === selectedSymbol) ||
    getStockBySymbol(selectedSymbol) ||
    quotes[0] ||
    MOCK_STOCKS[0];

  const filteredQuotes = quotes.filter(
    (q) =>
      q.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = marketDataService.filterHistoryByTimeframe(
    currentStock.history,
    timeframe
  );

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isPositive = currentStock.changePercent >= 0;

  return (
    <div className="space-y-6">
      {/* Search & Stock Quick Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stock symbol (e.g. AAPL, RELIANCE, NVDA)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Popular Ticker Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Quick Switch:</span>
          {quotes.slice(0, 6).map((q) => (
            <button
              key={q.symbol}
              onClick={() => onSelectStock(q.symbol)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedSymbol === q.symbol
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {q.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Header & OHLC Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{currentStock.name}</h1>
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700">
                {currentStock.symbol}
              </span>
              <DemoDataBadge compact={true} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sector: <strong className="text-slate-300">{currentStock.sector}</strong> | Market Cap:{' '}
              <strong className="text-slate-300">{currentStock.marketCap}</strong> | P/E Ratio:{' '}
              <strong className="text-slate-300">{currentStock.peRatio}</strong>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('ai-analyst')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all flex items-center gap-2 shadow-md"
            >
              <BrainCircuit className="w-4 h-4 text-amber-400" />
              <span>Run AI Analyst</span>
            </button>

            <button
              onClick={() => onNavigate('paper-trading')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Place Paper Trade</span>
            </button>
          </div>
        </div>

        {/* Price & OHLC Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Current Price</div>
            <div className="text-xl font-black text-white mt-0.5">
              {formatCurrency(currentStock.price)}
            </div>
            <div
              className={`text-xs font-bold mt-0.5 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {currentStock.changePercent}% ({isPositive ? '+' : ''}
              {currentStock.change.toFixed(2)})
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Open</div>
            <div className="text-base font-bold text-slate-200 mt-1">
              {formatCurrency(currentStock.open)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">High</div>
            <div className="text-base font-bold text-emerald-400 mt-1">
              {formatCurrency(currentStock.high)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Low</div>
            <div className="text-base font-bold text-rose-400 mt-1">
              {formatCurrency(currentStock.low)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Previous Close</div>
            <div className="text-base font-bold text-slate-200 mt-1">
              {formatCurrency(currentStock.previousClose)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">24h Volume</div>
            <div className="text-base font-bold text-slate-200 mt-1">
              {(currentStock.volume / 1000000).toFixed(1)}M
            </div>
          </div>
        </div>
      </div>

      {/* Main Stock Recharts Canvas */}
      <StockChart
        symbol={currentStock.symbol}
        history={filteredHistory}
        timeframe={timeframe}
        onTimeframeChange={(tf) => setTimeframe(tf)}
      />

      {/* Secondary Technical Indicator Sub-charts: RSI + MACD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RsiChart history={filteredHistory} />
        <MacdChart history={filteredHistory} />
      </div>
    </div>
  );
};
