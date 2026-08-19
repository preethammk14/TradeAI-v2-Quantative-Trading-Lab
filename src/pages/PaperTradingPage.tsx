import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { StockQuote, OrderType, TradeAction, PaperTrade } from '../types';
import { getStockBySymbol, MOCK_STOCKS } from '../data/mockStocks';
import { paperTradingService } from '../services/paperTradingService';
import { DemoDataBadge } from '../components/DemoDataBadge';

interface PaperTradingPageProps {
  quotes: StockQuote[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  currencySymbol: string;
  availableCash: number;
  openTrades: PaperTrade[];
  trades?: PaperTrade[];
  onTradeExecuted: () => void;
}

export const PaperTradingPage: React.FC<PaperTradingPageProps> = ({
  quotes,
  selectedSymbol,
  onSelectStock,
  currencySymbol,
  availableCash,
  openTrades,
  trades = [],
  onTradeExecuted,
}) => {
  const [action, setAction] = useState<TradeAction>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(10);
  const [customLimitPrice, setCustomLimitPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleResetPortfolio = () => {
    if (
      window.confirm(
        'WARNING: Are you sure you want to reset your paper trading portfolio? All active holdings and trade history will be erased, and your virtual capital will be restored to ₹1,00,000.'
      )
    ) {
      paperTradingService.resetPortfolio();
      setFeedback({
        success: true,
        message: 'Paper portfolio successfully reset to default capital of ₹1,00,000.',
      });
      onTradeExecuted();
    }
  };

  const currentStock = quotes.find((q) => q.symbol === selectedSymbol) || getStockBySymbol(selectedSymbol) || MOCK_STOCKS[0];
  const executionPrice =
    orderType === 'LIMIT' && customLimitPrice > 0 ? customLimitPrice : currentStock.price;

  const totalCost = executionPrice * (quantity || 0);

  // Position calculation for selected stock
  const symbolOpenTrades = openTrades.filter(
    (t) => t.symbol.toUpperCase() === currentStock.symbol.toUpperCase()
  );
  const heldShares = symbolOpenTrades.reduce((sum, t) => sum + t.quantity, 0);
  const totalCostBasis = symbolOpenTrades.reduce((sum, t) => sum + t.totalCost, 0);
  const avgEntryPrice = heldShares > 0 ? totalCostBasis / heldShares : 0;

  // Validation rules
  const isInsufficientCash = action === 'BUY' && totalCost > availableCash;
  const isSellingWithoutHolding = action === 'SELL' && heldShares === 0;
  const isSellingExcessQuantity = action === 'SELL' && quantity > heldShares;
  const isInvalidQuantity = quantity <= 0 || !Number.isInteger(quantity);

  const canExecute =
    !isInvalidQuantity &&
    (action === 'BUY' ? !isInsufficientCash : !isSellingWithoutHolding && !isSellingExcessQuantity);

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (action === 'BUY' && isInsufficientCash) {
      setFeedback({
        success: false,
        message: `Insufficient virtual cash. Required: ${formatCurrency(totalCost)}, Available: ${formatCurrency(availableCash)}`,
      });
      return;
    }

    if (action === 'SELL' && heldShares === 0) {
      setFeedback({
        success: false,
        message: `Cannot sell ${currentStock.symbol}. You do not currently hold any open position in this stock.`,
      });
      return;
    }

    if (action === 'SELL' && quantity > heldShares) {
      setFeedback({
        success: false,
        message: `Cannot sell ${quantity} shares of ${currentStock.symbol}. You currently hold only ${heldShares} share(s).`,
      });
      return;
    }

    const slVal = stopLoss ? parseFloat(stopLoss) : undefined;
    const tpVal = takeProfit ? parseFloat(takeProfit) : undefined;

    const result = paperTradingService.executePaperTrade({
      symbol: currentStock.symbol,
      stockName: currentStock.name,
      action,
      orderType,
      quantity,
      currentPrice: executionPrice,
      stopLoss: slVal,
      takeProfit: tpVal,
    });

    setFeedback(result);
    if (result.success) {
      onTradeExecuted();
    }
  };

  const handleCloseTrade = (tradeId: string) => {
    const trade = openTrades.find((t) => t.id === tradeId);
    if (!trade) return;

    const stock = quotes.find((q) => q.symbol === trade.symbol) || getStockBySymbol(trade.symbol);
    const exitPrice = stock ? stock.price : trade.currentPrice;

    const res = paperTradingService.closePosition(tradeId, exitPrice);
    setFeedback(res);
    if (res.success) {
      onTradeExecuted();
    }
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

      {/* Page Title & Balance Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span>Virtual Paper Trading Simulator</span>
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Paper Trading Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Execute simulated BUY and SELL orders using live demo prices • 100% simulated without financial risk
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Available Virtual Liquidity</span>
            <span className="text-lg font-black text-emerald-400">{formatCurrency(availableCash)}</span>
          </div>
          <button
            onClick={handleResetPortfolio}
            type="button"
            className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
            title="Reset paper portfolio back to initial ₹1,00,000"
          >
            Reset Capital
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Order Entry Form + Open Positions List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Entry Form (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">New Order Entry</h3>
              <p className="text-[10px] text-slate-400">Simulated order routing</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20">
              Demo Price Feed
            </span>
          </div>

          <form onSubmit={handleExecuteTrade} className="space-y-4 text-xs">
            {/* Symbol Selector */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Target Equity Symbol:</label>
              <select
                value={selectedSymbol}
                onChange={(e) => onSelectStock(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              >
                {quotes.map((q) => (
                  <option key={q.symbol} value={q.symbol}>
                    {q.symbol} — {q.name} ({formatCurrency(q.price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Switch: Buy vs Sell */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('BUY')}
                className={`py-2.5 rounded-xl font-black transition-all ${
                  action === 'BUY'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                BUY (LONG)
              </button>
              <button
                type="button"
                onClick={() => setAction('SELL')}
                className={`py-2.5 rounded-xl font-black transition-all ${
                  action === 'SELL'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                SELL (EXIT)
              </button>
            </div>

            {/* Position / Holding status badge */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Current Holding:</span>
              <span className={`font-bold ${heldShares > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {heldShares} shares {heldShares > 0 ? `(Avg: ${formatCurrency(avgEntryPrice)})` : ''}
              </span>
            </div>

            {/* Order Type Switch */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Order Execution Type:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`py-2 rounded-xl font-semibold border transition-all ${
                    orderType === 'MARKET'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Market Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('LIMIT');
                    if (customLimitPrice === 0) setCustomLimitPrice(currentStock.price);
                  }}
                  className={`py-2 rounded-xl font-semibold border transition-all ${
                    orderType === 'LIMIT'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Limit Order
                </button>
              </div>
            </div>

            {/* Custom Limit Price Input if Limit Order */}
            {orderType === 'LIMIT' && (
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Limit Price ({currencySymbol}):</label>
                <input
                  type="number"
                  step="0.01"
                  value={customLimitPrice}
                  onChange={(e) => setCustomLimitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Share Quantity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 font-medium">Quantity (Shares):</label>
                {action === 'SELL' && heldShares > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(heldShares)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                  >
                    Max ({heldShares})
                  </button>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={action === 'SELL' && heldShares > 0 ? heldShares : undefined}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Stop Loss ({currencySymbol}):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-rose-400 font-bold rounded-xl p-2 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Take Profit ({currencySymbol}):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-xl p-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Total Cost Summary Box */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Demo Execution Price:</span>
                <span className="font-bold text-slate-200">{formatCurrency(executionPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>{action === 'BUY' ? 'Estimated Total Outlay:' : 'Estimated Gross Proceeds:'}</span>
                <span className="font-black text-white text-sm">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            {/* Validation Warnings */}
            {action === 'BUY' && isInsufficientCash && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Insufficient virtual cash. Need {formatCurrency(totalCost)}, available {formatCurrency(availableCash)}.</span>
              </div>
            )}

            {action === 'SELL' && isSellingWithoutHolding && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You do not own any shares of {currentStock.symbol} to sell.</span>
              </div>
            )}

            {action === 'SELL' && isSellingExcessQuantity && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cannot sell {quantity} shares. You only hold {heldShares} share(s).</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canExecute}
              className={`w-full py-3 rounded-xl font-black text-sm transition-all shadow-lg ${
                !canExecute
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  : action === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              Execute Paper {action} Order
            </button>
          </form>
        </div>

        {/* Active Open Positions Table (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Active Open Paper Positions</h3>
                <p className="text-xs text-slate-400">Position quantities, average entry prices & unrealized P/L</p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {openTrades.length} Active
              </span>
            </div>

            {openTrades.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-slate-400 text-xs">
                <p className="font-semibold text-slate-300">No active paper trading positions currently open.</p>
                <p className="text-slate-500">Select a symbol on the left and place a simulated BUY order to open a position.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Entry Price</th>
                      <th className="py-2.5 px-3">Current Demo Price</th>
                      <th className="py-2.5 px-3">Unrealized P/L</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {openTrades.map((trade) => {
                      const isWin = trade.unrealizedPnL >= 0;
                      return (
                        <tr key={trade.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-white">
                            {trade.symbol}
                            <div className="text-[10px] text-slate-500 font-normal">{trade.stockName}</div>
                          </td>
                          <td className="py-3 px-3">
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
                          <td className="py-3 px-3 font-semibold">{trade.quantity}</td>
                          <td className="py-3 px-3">{formatCurrency(trade.entryPrice)}</td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {formatCurrency(trade.currentPrice)}
                          </td>
                          <td className={`py-3 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}{formatCurrency(trade.unrealizedPnL)} ({isWin ? '+' : ''}{trade.unrealizedPnLPercent}%)
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleCloseTrade(trade.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all"
                            >
                              Close Position
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transaction / History Table (Requirement 5) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Simulated Transaction History</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  Paper Trading Only
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {trades.length} Total Record{trades.length === 1 ? '' : 's'}
              </span>
            </div>

            {trades.length === 0 ? (
              <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                <p className="text-slate-300 font-semibold">No paper trade transactions recorded yet.</p>
                <p className="text-slate-500">Every executed BUY or SELL trade will be logged here with timestamp and P/L.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Side</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trades.map((trade) => {
                      const isClosed = trade.status === 'CLOSED';
                      const pnl = isClosed ? trade.realizedPnL ?? 0 : trade.unrealizedPnL ?? 0;
                      const isProfit = pnl >= 0;
                      const displayTime = trade.timestamp || new Date(trade.openedAt).toLocaleString();

                      return (
                        <tr key={trade.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {displayTime}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {trade.symbol}
                          </td>
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
                          <td className="py-2.5 px-3 font-mono">
                            {formatCurrency(isClosed && trade.exitPrice ? trade.exitPrice : trade.entryPrice)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isClosed ? (
                              <span>
                                {isProfit ? '+' : ''}{formatCurrency(pnl)}
                                <span className="text-[10px] font-normal text-slate-500 ml-1">(Realized)</span>
                              </span>
                            ) : (
                              <span>
                                {isProfit ? '+' : ''}{formatCurrency(pnl)}
                                <span className="text-[10px] font-normal text-slate-500 ml-1">(Unrealized)</span>
                              </span>
                            )}
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
    </div>
  );
};

