import {
  PaperTrade,
  PortfolioSummary,
  TradeAction,
  OrderType,
  StockQuote,
  PortfolioAnalytics,
  PortfolioSnapshot,
  HoldingAllocation,
} from '../types';
import { portfolioStorageService, INITIAL_VIRTUAL_CAPITAL } from './portfolioStorageService';

export class PaperTradingService {
  private trades: PaperTrade[] = [];
  private availableCash: number = INITIAL_VIRTUAL_CAPITAL;

  constructor() {
    this.loadState();
  }

  private loadState() {
    const { trades, availableCash } = portfolioStorageService.loadPortfolio();
    this.trades = trades;
    this.availableCash = availableCash;
  }

  private saveState() {
    portfolioStorageService.savePortfolio(this.trades, this.availableCash);
  }

  public getAvailableCash(): number {
    return this.availableCash;
  }

  public getTrades(): PaperTrade[] {
    return [...this.trades];
  }

  public getOpenTrades(): PaperTrade[] {
    return this.trades.filter((t) => t.status === 'OPEN');
  }

  public getClosedTrades(): PaperTrade[] {
    return this.trades.filter((t) => t.status === 'CLOSED');
  }

  /**
   * Recalculates open trades with current stock market prices and outputs portfolio summary
   */
  public getPortfolioSummary(quotes: StockQuote[]): {
    summary: PortfolioSummary;
    updatedTrades: PaperTrade[];
  } {
    const quoteMap = new Map<string, StockQuote>();
    quotes.forEach((q) => quoteMap.set(q.symbol.toUpperCase(), q));

    let investedAmount = 0;
    let currentPortfolioValue = 0;
    let todayPnL = 0;

    const updatedTrades = this.trades.map((trade) => {
      if (trade.status === 'OPEN') {
        const liveQuote = quoteMap.get(trade.symbol.toUpperCase());
        const currentPrice = liveQuote ? liveQuote.price : trade.entryPrice;

        const currentValue = currentPrice * trade.quantity;
        const unrealizedPnL = currentValue - trade.totalCost;
        const unrealizedPnLPercent =
          trade.totalCost > 0 ? (unrealizedPnL / trade.totalCost) * 100 : 0;

        investedAmount += trade.totalCost;
        currentPortfolioValue += currentValue;

        if (liveQuote) {
          const dayChangePerShare = liveQuote.change;
          todayPnL += dayChangePerShare * trade.quantity;
        }

        return {
          ...trade,
          currentPrice,
          currentValue: Number(currentValue.toFixed(2)),
          unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
          unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
        };
      }
      return trade;
    });

    const closedTrades = updatedTrades.filter((t) => t.status === 'CLOSED');
    const totalClosedCount = closedTrades.length;
    const winningClosedCount = closedTrades.filter(
      (t) => (t.realizedPnL || 0) > 0
    ).length;
    const winRate = totalClosedCount > 0 ? (winningClosedCount / totalClosedCount) * 100 : 0;

    const totalPortfolioValue = this.availableCash + currentPortfolioValue;
    const overallPnL = totalPortfolioValue - INITIAL_VIRTUAL_CAPITAL;
    const overallPnLPercent = (overallPnL / INITIAL_VIRTUAL_CAPITAL) * 100;
    const todayPnLPercent =
      totalPortfolioValue > 0 ? (todayPnL / totalPortfolioValue) * 100 : 0;

    const summary: PortfolioSummary = {
      virtualBalance: INITIAL_VIRTUAL_CAPITAL,
      availableCash: Number(this.availableCash.toFixed(2)),
      investedAmount: Number(investedAmount.toFixed(2)),
      totalValue: Number(totalPortfolioValue.toFixed(2)),
      todayPnL: Number(todayPnL.toFixed(2)),
      todayPnLPercent: Number(todayPnLPercent.toFixed(2)),
      overallPnL: Number(overallPnL.toFixed(2)),
      overallPnLPercent: Number(overallPnLPercent.toFixed(2)),
      winRate: Number(winRate.toFixed(1)),
      openPositionsCount: updatedTrades.filter((t) => t.status === 'OPEN').length,
      closedTradesCount: closedTrades.length,
      totalTradesCount: updatedTrades.length,
    };

    return { summary, updatedTrades };
  }

  /**
   * Generates comprehensive local portfolio analytics & performance snapshot timeline
   */
  public getPortfolioAnalytics(quotes: StockQuote[]): {
    analytics: PortfolioAnalytics;
    snapshots: PortfolioSnapshot[];
  } {
    const { summary, updatedTrades } = this.getPortfolioSummary(quotes);

    const openTrades = updatedTrades.filter((t) => t.status === 'OPEN');
    const closedTrades = updatedTrades.filter((t) => t.status === 'CLOSED');

    // 1. P/L Calculations (Strictly separated: Realized vs Unrealized)
    const unrealizedPnL = openTrades.reduce((acc, t) => acc + (t.unrealizedPnL || 0), 0);
    const realizedPnL = closedTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
    const totalPnL = realizedPnL + unrealizedPnL;

    // 2. Closed Trades Performance Stats
    const winningClosedTrades = closedTrades.filter((t) => (t.realizedPnL || 0) > 0);
    const losingClosedTrades = closedTrades.filter((t) => (t.realizedPnL || 0) < 0);

    const totalWinningAmount = winningClosedTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
    const totalLosingAmount = losingClosedTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);

    const avgWinningTrade =
      winningClosedTrades.length > 0 ? totalWinningAmount / winningClosedTrades.length : 0;
    const avgLosingTrade =
      losingClosedTrades.length > 0 ? totalLosingAmount / losingClosedTrades.length : 0;

    const closedPnLs = closedTrades.map((t) => t.realizedPnL || 0);
    const largestProfit = closedPnLs.length > 0 ? Math.max(0, ...closedPnLs) : 0;
    const largestLoss = closedPnLs.length > 0 ? Math.min(0, ...closedPnLs) : 0;

    // 3. Asset Holdings Allocation (Grouping by Symbol)
    const holdingsMap = new Map<string, HoldingAllocation>();
    openTrades.forEach((t) => {
      const existing = holdingsMap.get(t.symbol);
      const qty = t.quantity;
      const cost = t.totalCost;
      const val = t.currentValue;
      const unPnL = t.unrealizedPnL || 0;

      if (existing) {
        existing.quantity += qty;
        existing.totalCost += cost;
        existing.currentValue += val;
        existing.unrealizedPnL += unPnL;
        existing.avgEntryPrice = existing.totalCost / existing.quantity;
        existing.currentPrice = existing.currentValue / existing.quantity;
        existing.unrealizedPnLPercent =
          existing.totalCost > 0 ? (existing.unrealizedPnL / existing.totalCost) * 100 : 0;
        existing.portfolioPercent =
          summary.totalValue > 0 ? (existing.currentValue / summary.totalValue) * 100 : 0;
      } else {
        holdingsMap.set(t.symbol, {
          symbol: t.symbol,
          stockName: t.stockName,
          quantity: qty,
          avgEntryPrice: t.entryPrice,
          currentPrice: t.currentPrice,
          totalCost: cost,
          currentValue: val,
          unrealizedPnL: unPnL,
          unrealizedPnLPercent: t.unrealizedPnLPercent || 0,
          portfolioPercent:
            summary.totalValue > 0 ? (val / summary.totalValue) * 100 : 0,
        });
      }
    });

    const holdingsAllocation = Array.from(holdingsMap.values()).map((h) => ({
      ...h,
      avgEntryPrice: Number(h.avgEntryPrice.toFixed(2)),
      currentPrice: Number(h.currentPrice.toFixed(2)),
      totalCost: Number(h.totalCost.toFixed(2)),
      currentValue: Number(h.currentValue.toFixed(2)),
      unrealizedPnL: Number(h.unrealizedPnL.toFixed(2)),
      unrealizedPnLPercent: Number(h.unrealizedPnLPercent.toFixed(2)),
      portfolioPercent: Number(h.portfolioPercent.toFixed(1)),
    }));

    // 4. Best & Worst Performers
    let bestHolding: PortfolioAnalytics['bestHolding'] = undefined;
    let worstHolding: PortfolioAnalytics['worstHolding'] = undefined;

    if (holdingsAllocation.length > 0) {
      const sortedByUnPnL = [...holdingsAllocation].sort(
        (a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent
      );
      const best = sortedByUnPnL[0];
      const worst = sortedByUnPnL[sortedByUnPnL.length - 1];

      bestHolding = {
        symbol: best.symbol,
        stockName: best.stockName,
        unrealizedPnL: best.unrealizedPnL,
        unrealizedPnLPercent: best.unrealizedPnLPercent,
      };

      worstHolding = {
        symbol: worst.symbol,
        stockName: worst.stockName,
        unrealizedPnL: worst.unrealizedPnL,
        unrealizedPnLPercent: worst.unrealizedPnLPercent,
      };
    }

    let bestClosedTrade: PortfolioAnalytics['bestClosedTrade'] = undefined;
    let worstClosedTrade: PortfolioAnalytics['worstClosedTrade'] = undefined;

    if (closedTrades.length > 0) {
      const sortedClosed = [...closedTrades].sort(
        (a, b) => (b.realizedPnL || 0) - (a.realizedPnL || 0)
      );
      const bestC = sortedClosed[0];
      const worstC = sortedClosed[sortedClosed.length - 1];

      if ((bestC.realizedPnL || 0) > 0) {
        bestClosedTrade = {
          symbol: bestC.symbol,
          stockName: bestC.stockName,
          realizedPnL: bestC.realizedPnL || 0,
          realizedPnLPercent: bestC.realizedPnLPercent || 0,
        };
      }

      if ((worstC.realizedPnL || 0) < 0) {
        worstClosedTrade = {
          symbol: worstC.symbol,
          stockName: worstC.stockName,
          realizedPnL: worstC.realizedPnL || 0,
          realizedPnLPercent: worstC.realizedPnLPercent || 0,
        };
      }
    }

    // 5. Risk & Concentration Summary
    const cashAllocationPercent =
      summary.totalValue > 0 ? (summary.availableCash / summary.totalValue) * 100 : 100;
    const investedAllocationPercent =
      summary.totalValue > 0 ? (summary.investedAmount / summary.totalValue) * 100 : 0;

    let largestPositionPercent = 0;
    let largestPositionSymbol: string | undefined = undefined;

    if (holdingsAllocation.length > 0) {
      const sortedByPortPct = [...holdingsAllocation].sort(
        (a, b) => b.portfolioPercent - a.portfolioPercent
      );
      largestPositionPercent = sortedByPortPct[0].portfolioPercent;
      largestPositionSymbol = sortedByPortPct[0].symbol;
    }

    let concentrationLevel: PortfolioAnalytics['concentrationLevel'] = 'Low Concentration';
    if (largestPositionPercent > 40 || (holdingsAllocation.length === 1 && investedAllocationPercent > 50)) {
      concentrationLevel = 'High Concentration';
    } else if (largestPositionPercent > 25 || holdingsAllocation.length === 2) {
      concentrationLevel = 'Moderate Concentration';
    }

    let diversificationStatus = '100% Cash Liquidity. No active market risk.';
    if (holdingsAllocation.length === 1) {
      diversificationStatus = 'Single-stock position. Consider spreading capital across multiple sectors.';
    } else if (holdingsAllocation.length >= 2 && holdingsAllocation.length <= 4) {
      diversificationStatus = 'Balanced asset distribution across active holdings.';
    } else if (holdingsAllocation.length > 4) {
      diversificationStatus = 'Well-diversified portfolio structure across multiple assets.';
    }

    // 6. Performance Snapshots Update
    const snapshots = this.updateSnapshots(
      summary.totalValue,
      summary.availableCash,
      summary.investedAmount,
      unrealizedPnL,
      realizedPnL
    );

    const analytics: PortfolioAnalytics = {
      totalPortfolioValue: Number(summary.totalValue.toFixed(2)),
      initialCapital: INITIAL_VIRTUAL_CAPITAL,
      availableCash: Number(summary.availableCash.toFixed(2)),
      totalInvested: Number(summary.investedAmount.toFixed(2)),
      totalReturn: Number((summary.totalValue - INITIAL_VIRTUAL_CAPITAL).toFixed(2)),
      totalReturnPercent: Number(
        (((summary.totalValue - INITIAL_VIRTUAL_CAPITAL) / INITIAL_VIRTUAL_CAPITAL) * 100).toFixed(2)
      ),

      realizedPnL: Number(realizedPnL.toFixed(2)),
      unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      todayPnL: Number(summary.todayPnL.toFixed(2)),

      openPositionsCount: openTrades.length,
      closedTradesCount: closedTrades.length,
      totalTradesCount: updatedTrades.length,
      buyOrdersCount: updatedTrades.filter((t) => t.action === 'BUY').length,
      sellOrdersCount: updatedTrades.filter((t) => t.action === 'SELL' || t.status === 'CLOSED').length,
      winningClosedTradesCount: winningClosedTrades.length,
      losingClosedTradesCount: losingClosedTrades.length,
      winRatePercent:
        closedTrades.length > 0
          ? Number(((winningClosedTrades.length / closedTrades.length) * 100).toFixed(1))
          : 0,

      avgWinningTrade: Number(avgWinningTrade.toFixed(2)),
      avgLosingTrade: Number(avgLosingTrade.toFixed(2)),
      largestProfit: Number(largestProfit.toFixed(2)),
      largestLoss: Number(largestLoss.toFixed(2)),

      bestHolding,
      worstHolding,
      bestClosedTrade,
      worstClosedTrade,

      holdingsAllocation,

      cashAllocationPercent: Number(cashAllocationPercent.toFixed(1)),
      investedAllocationPercent: Number(investedAllocationPercent.toFixed(1)),
      largestPositionPercent: Number(largestPositionPercent.toFixed(1)),
      largestPositionSymbol,
      concentrationLevel,
      diversificationStatus,
    };

    return { analytics, snapshots };
  }

  private updateSnapshots(
    totalValue: number,
    cash: number,
    invested: number,
    unrealizedPnL: number,
    realizedPnL: number
  ): PortfolioSnapshot[] {
    let snapshots = portfolioStorageService.loadSnapshots();

    if (snapshots.length === 0) {
      // Create baseline initial capital snapshot
      const baselineTime = new Date(Date.now() - 3600000);
      snapshots.push({
        timestamp: baselineTime.toISOString(),
        timeLabel: 'Baseline',
        totalValue: INITIAL_VIRTUAL_CAPITAL,
        availableCash: INITIAL_VIRTUAL_CAPITAL,
        investedAmount: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
      });

      // Reconstruct historical milestones from existing trades sorted chronologically
      const sortedTrades = [...this.trades].sort(
        (a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()
      );

      sortedTrades.forEach((t) => {
        const openedDate = new Date(t.openedAt);
        snapshots.push({
          timestamp: openedDate.toISOString(),
          timeLabel: openedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          totalValue: Number(
            (INITIAL_VIRTUAL_CAPITAL + (t.unrealizedPnL || 0) + (t.realizedPnL || 0)).toFixed(2)
          ),
          availableCash: Number(cash.toFixed(2)),
          investedAmount: Number((t.totalCost || 0).toFixed(2)),
          unrealizedPnL: Number((t.unrealizedPnL || 0).toFixed(2)),
          realizedPnL: Number((t.realizedPnL || 0).toFixed(2)),
        });
      });
    }

    const lastSnap = snapshots[snapshots.length - 1];
    const now = new Date();
    const nowISO = now.toISOString();
    const nowTimeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const shouldAddSnapshot =
      !lastSnap ||
      Math.abs(lastSnap.totalValue - totalValue) >= 0.01 ||
      now.getTime() - new Date(lastSnap.timestamp).getTime() > 10 * 60 * 1000;

    if (shouldAddSnapshot) {
      snapshots.push({
        timestamp: nowISO,
        timeLabel: nowTimeLabel,
        totalValue: Number(totalValue.toFixed(2)),
        availableCash: Number(cash.toFixed(2)),
        investedAmount: Number(invested.toFixed(2)),
        unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
        realizedPnL: Number(realizedPnL.toFixed(2)),
      });

      portfolioStorageService.saveSnapshots(snapshots);
    }

    return snapshots;
  }

  /**
   * Places a paper order (BUY to open position, SELL to close/reduce holding)
   */
  public executePaperTrade(params: {
    symbol: string;
    stockName: string;
    action: TradeAction;
    orderType: OrderType;
    quantity: number;
    currentPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }): { success: boolean; message: string; trade?: PaperTrade } {
    const {
      symbol,
      stockName,
      action,
      orderType,
      quantity,
      currentPrice,
      stopLoss,
      takeProfit,
    } = params;

    const targetSymbol = symbol.toUpperCase();

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { success: false, message: 'Quantity must be a positive integer greater than 0.' };
    }

    if (currentPrice <= 0) {
      return { success: false, message: 'Invalid execution price.' };
    }

    const totalCost = currentPrice * quantity;

    if (action === 'BUY') {
      if (totalCost > this.availableCash) {
        return {
          success: false,
          message: `Insufficient virtual cash. Required: ₹${totalCost.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })}, Available: ₹${this.availableCash.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })}`,
        };
      }

      this.availableCash -= totalCost;

      const now = new Date();
      const newTrade: PaperTrade = {
        id: `TRADE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        symbol: targetSymbol,
        stockName,
        action: 'BUY',
        orderType,
        quantity,
        entryPrice: Number(currentPrice.toFixed(2)),
        currentPrice: Number(currentPrice.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        currentValue: Number(totalCost.toFixed(2)),
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        status: 'OPEN',
        openedAt: now.toISOString(),
        timestamp: now.toLocaleString(),
        stopLoss,
        takeProfit,
      };

      this.trades.unshift(newTrade);
      this.saveState();

      return {
        success: true,
        message: `Successfully bought ${quantity} share(s) of ${targetSymbol} at ₹${currentPrice.toFixed(2)}`,
        trade: newTrade,
      };
    } else {
      // SELL Action - Reduces/Closes open holdings
      const openBuyTrades = this.trades.filter(
        (t) => t.symbol.toUpperCase() === targetSymbol && t.status === 'OPEN'
      );
      const totalSharesHeld = openBuyTrades.reduce((sum, t) => sum + t.quantity, 0);

      if (totalSharesHeld === 0) {
        return {
          success: false,
          message: `Cannot sell ${targetSymbol}. You do not currently hold any open position in this stock.`,
        };
      }

      if (quantity > totalSharesHeld) {
        return {
          success: false,
          message: `Cannot sell ${quantity} shares of ${targetSymbol}. You currently hold only ${totalSharesHeld} share(s).`,
        };
      }

      let remainingToSell = quantity;
      let totalProceeds = 0;
      let totalRealizedPnL = 0;
      const now = new Date();

      for (const trade of openBuyTrades) {
        if (remainingToSell <= 0) break;

        const index = this.trades.findIndex((t) => t.id === trade.id);
        if (index === -1) continue;

        if (trade.quantity <= remainingToSell) {
          // Close this entire position
          const soldQty = trade.quantity;
          const proceeds = currentPrice * soldQty;
          const pnl = proceeds - trade.totalCost;

          totalProceeds += proceeds;
          totalRealizedPnL += pnl;

          this.trades[index] = {
            ...trade,
            action: 'SELL',
            exitPrice: Number(currentPrice.toFixed(2)),
            currentPrice: Number(currentPrice.toFixed(2)),
            realizedPnL: Number(pnl.toFixed(2)),
            realizedPnLPercent: Number(((pnl / trade.totalCost) * 100).toFixed(2)),
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            status: 'CLOSED',
            closedAt: now.toISOString(),
          };

          remainingToSell -= soldQty;
        } else {
          // Partially close position
          const soldQty = remainingToSell;
          const soldCost = trade.entryPrice * soldQty;
          const proceeds = currentPrice * soldQty;
          const pnl = proceeds - soldCost;

          totalProceeds += proceeds;
          totalRealizedPnL += pnl;

          // Record closed trade for sold portion
          const closedPartialTrade: PaperTrade = {
            ...trade,
            id: `TRADE_${Date.now()}_PART_${Math.random().toString(36).substring(2, 6)}`,
            action: 'SELL',
            quantity: soldQty,
            totalCost: Number(soldCost.toFixed(2)),
            exitPrice: Number(currentPrice.toFixed(2)),
            currentPrice: Number(currentPrice.toFixed(2)),
            realizedPnL: Number(pnl.toFixed(2)),
            realizedPnLPercent: Number(((pnl / soldCost) * 100).toFixed(2)),
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            status: 'CLOSED',
            openedAt: trade.openedAt,
            closedAt: now.toISOString(),
            timestamp: now.toLocaleString(),
          };

          // Update remaining open portion
          const remainingQty = trade.quantity - soldQty;
          const remainingCost = trade.entryPrice * remainingQty;
          const remainingUnrealized = (currentPrice - trade.entryPrice) * remainingQty;
          const remainingUnrealizedPct = remainingCost > 0 ? (remainingUnrealized / remainingCost) * 100 : 0;

          this.trades[index] = {
            ...trade,
            quantity: remainingQty,
            totalCost: Number(remainingCost.toFixed(2)),
            currentValue: Number((currentPrice * remainingQty).toFixed(2)),
            unrealizedPnL: Number(remainingUnrealized.toFixed(2)),
            unrealizedPnLPercent: Number(remainingUnrealizedPct.toFixed(2)),
          };

          this.trades.unshift(closedPartialTrade);
          remainingToSell = 0;
        }
      }

      this.availableCash += totalProceeds;
      this.saveState();

      return {
        success: true,
        message: `Successfully sold ${quantity} share(s) of ${targetSymbol} at ₹${currentPrice.toFixed(2)}. Realized P/L: ₹${totalRealizedPnL.toFixed(2)}`,
      };
    }
  }

  /**
   * Closes an active open position completely at given exit price
   */
  public closePosition(
    tradeId: string,
    exitPrice: number
  ): { success: boolean; message: string; trade?: PaperTrade } {
    const index = this.trades.findIndex((t) => t.id === tradeId && t.status === 'OPEN');
    if (index === -1) {
      return { success: false, message: 'Open position not found.' };
    }

    const trade = this.trades[index];
    const exitValue = exitPrice * trade.quantity;
    const realizedPnL = exitValue - trade.totalCost;
    const realizedPnLPercent = trade.totalCost > 0 ? (realizedPnL / trade.totalCost) * 100 : 0;

    this.availableCash += exitValue;
    const now = new Date();

    const closedTrade: PaperTrade = {
      ...trade,
      exitPrice: Number(exitPrice.toFixed(2)),
      currentPrice: Number(exitPrice.toFixed(2)),
      realizedPnL: Number(realizedPnL.toFixed(2)),
      realizedPnLPercent: Number(realizedPnLPercent.toFixed(2)),
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      status: 'CLOSED',
      closedAt: now.toISOString(),
    };

    this.trades[index] = closedTrade;
    this.saveState();

    return {
      success: true,
      message: `Closed position for ${trade.symbol}. Realized P/L: ₹${realizedPnL.toFixed(2)} (${realizedPnLPercent >= 0 ? '+' : ''}${realizedPnLPercent.toFixed(2)}%)`,
      trade: closedTrade,
    };
  }

  /**
   * Reset portfolio to initial state
   */
  public resetPortfolio(): { trades: PaperTrade[]; availableCash: number } {
    const restored = portfolioStorageService.resetStorage();
    this.trades = restored.trades;
    this.availableCash = restored.availableCash;
    return restored;
  }
}

export const paperTradingService = new PaperTradingService();
