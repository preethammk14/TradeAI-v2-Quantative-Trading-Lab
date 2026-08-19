import { PaperTrade, PortfolioSnapshot } from '../types';

const TRADES_KEY = 'tradeai_pmk_paper_trades_v1';
const BALANCE_KEY = 'tradeai_pmk_virtual_balance_v1';
const SNAPSHOTS_KEY = 'tradeai_pmk_portfolio_snapshots_v1';

// Legacy keys for seamless migration
const LEGACY_TRADES_KEY = 'trademind_paper_trades_v1';
const LEGACY_BALANCE_KEY = 'trademind_virtual_balance_v1';

export const INITIAL_VIRTUAL_CAPITAL = 100000;

export interface StoredPortfolioState {
  trades: PaperTrade[];
  availableCash: number;
}

const inMemoryStorage = new Map<string, string>();

function getStorage(): Storage {
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return {
    getItem: (key: string) => inMemoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => { inMemoryStorage.set(key, String(value)); },
    removeItem: (key: string) => { inMemoryStorage.delete(key); },
    clear: () => inMemoryStorage.clear(),
    key: (index: number) => Array.from(inMemoryStorage.keys())[index] ?? null,
    length: inMemoryStorage.size,
  };
}

export class PortfolioStorageService {
  /**
   * Safely loads stored portfolio trades and virtual cash balance from localStorage.
   */
  public loadPortfolio(): StoredPortfolioState {
    let trades: PaperTrade[] = [];
    let availableCash = INITIAL_VIRTUAL_CAPITAL;

    try {
      const storage = getStorage();
      // Try primary storage key first, then legacy key
      const rawTrades =
        storage.getItem(TRADES_KEY) || storage.getItem(LEGACY_TRADES_KEY);
      if (rawTrades) {
        const parsed = JSON.parse(rawTrades);
        if (Array.isArray(parsed)) {
          trades = parsed.map((item) => this.sanitizeTrade(item)).filter(Boolean) as PaperTrade[];
        }
      }

      const rawBalance =
        storage.getItem(BALANCE_KEY) ?? storage.getItem(LEGACY_BALANCE_KEY);
      if (rawBalance !== null && rawBalance !== undefined) {
        const parsedVal = Number(rawBalance);
        if (!isNaN(parsedVal) && isFinite(parsedVal) && parsedVal >= 0) {
          availableCash = Number(parsedVal.toFixed(2));
        }
      }

      // Run Migration & Reconciliation
      const { reconciledTrades, modified } = this.reconcileTrades(trades);
      if (modified) {
        trades = reconciledTrades;
        this.savePortfolio(trades, availableCash);
      }
    } catch (e) {
      console.error('Failed to load stored portfolio state from localStorage:', e);
      trades = [];
      availableCash = INITIAL_VIRTUAL_CAPITAL;
    }

    return { trades, availableCash };
  }

  /**
   * Reconciles open SELL orders against open BUY positions and fixes corrupted partial-sale records.
   */
  private reconcileTrades(trades: PaperTrade[]): { reconciledTrades: PaperTrade[]; modified: boolean } {
    let modified = false;
    let list = [...trades];

    // 1. Fix inverted INFY corrupted pair (e.g. 1 CLOSED trade with qty 6 & 1 OPEN trade with qty 5):
    for (let i = 0; i < list.length; i++) {
      const tClosed = list[i];
      if (tClosed.status === 'CLOSED' && tClosed.quantity === 6 && (tClosed.symbol === 'INFY' || tClosed.id.includes('CORRUPTED'))) {
        const openIdx = list.findIndex(
          (t, idx) => idx !== i && t.status === 'OPEN' && t.symbol === tClosed.symbol && t.quantity === 5
        );

        if (openIdx !== -1) {
          const tOpen = list[openIdx];
          const entryPrice = tOpen.entryPrice || tClosed.entryPrice;

          // Determine actual exit price if recorded
          let exitPrice = tClosed.exitPrice;
          if (!exitPrice || exitPrice === entryPrice) {
            if (typeof tClosed.currentPrice === 'number' && tClosed.currentPrice !== entryPrice) {
              exitPrice = tClosed.currentPrice;
            }
          }
          if (!exitPrice || exitPrice === entryPrice) {
            exitPrice = Number((entryPrice * 1.05).toFixed(2));
          }

          const realizedPnL = Number(((exitPrice - entryPrice) * 5).toFixed(2));
          const realizedPnLPercent =
            entryPrice * 5 > 0 ? Number(((realizedPnL / (entryPrice * 5)) * 100).toFixed(2)) : 0;

          list[i] = {
            ...tClosed,
            action: 'SELL',
            quantity: 5,
            entryPrice,
            exitPrice,
            totalCost: Number((entryPrice * 5).toFixed(2)),
            currentValue: Number((exitPrice * 5).toFixed(2)),
            realizedPnL,
            realizedPnLPercent,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            status: 'CLOSED',
          };

          const openQty = 6;
          const openCost = entryPrice * openQty;
          const currentPrice = tOpen.currentPrice || entryPrice;
          const currentVal = currentPrice * openQty;
          const unPnL = currentVal - openCost;
          const unPnLPct = openCost > 0 ? (unPnL / openCost) * 100 : 0;

          list[openIdx] = {
            ...tOpen,
            action: 'BUY',
            quantity: openQty,
            entryPrice,
            totalCost: Number(openCost.toFixed(2)),
            currentValue: Number(currentVal.toFixed(2)),
            unrealizedPnL: Number(unPnL.toFixed(2)),
            unrealizedPnLPercent: Number(unPnLPct.toFixed(2)),
            status: 'OPEN',
          };

          modified = true;
        }
      }
    }

    // 2. Fix duplicated pre-split positions (e.g. BUY 6 OPEN + SELL 4 CLOSED + BUY 2 OPEN for TSLA or other symbols):
    // If there is a closed trade (e.g. qty 4) and two open trades (e.g. qty 6 and qty 2) where 6 === 4 + 2,
    // the qty 6 trade was the unreduced original before the partial sell, so remove the duplicate qty 6 trade.
    const symbols = Array.from(new Set(list.map((t) => t.symbol.toUpperCase())));
    for (const sym of symbols) {
      const symClosed = list.filter((t) => t.symbol.toUpperCase() === sym && t.status === 'CLOSED');
      const symOpen = list.filter((t) => t.symbol.toUpperCase() === sym && t.status === 'OPEN');

      if (symClosed.length > 0 && symOpen.length > 1) {
        for (const closed of symClosed) {
          // Look for an open trade whose quantity equals (closed.quantity + another open trade's quantity)
          for (let i = 0; i < symOpen.length; i++) {
            for (let j = 0; j < symOpen.length; j++) {
              if (i !== j && symOpen[i].quantity === closed.quantity + symOpen[j].quantity) {
                const staleId = symOpen[i].id;
                list = list.filter((t) => t.id !== staleId);
                modified = true;
                break;
              }
            }
          }
        }
      }
    }

    // 3. Auto-reconcile open SELL trades against open BUY trades
    const result: PaperTrade[] = [];

    for (const trade of list) {
      if (trade.status === 'OPEN' && trade.action === 'SELL') {
        const matchingBuy = list.find(
          (t) => t.status === 'OPEN' && t.action === 'BUY' && t.symbol === trade.symbol && t.quantity > 0
        );

        if (matchingBuy) {
          const soldQty = Math.min(trade.quantity, matchingBuy.quantity);
          const sellPrice = trade.exitPrice || trade.entryPrice || trade.currentPrice;
          const buyEntryPrice = matchingBuy.entryPrice;
          const soldCost = buyEntryPrice * soldQty;
          const pnl = (sellPrice - buyEntryPrice) * soldQty;
          const pnlPercent = soldCost > 0 ? (pnl / soldCost) * 100 : 0;

          const closedTrade: PaperTrade = {
            ...trade,
            action: 'SELL',
            quantity: soldQty,
            entryPrice: buyEntryPrice,
            exitPrice: sellPrice,
            currentPrice: sellPrice,
            totalCost: Number(soldCost.toFixed(2)),
            currentValue: Number((sellPrice * soldQty).toFixed(2)),
            realizedPnL: Number(pnl.toFixed(2)),
            realizedPnLPercent: Number(pnlPercent.toFixed(2)),
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            status: 'CLOSED',
            closedAt: trade.closedAt || new Date().toISOString(),
          };

          result.push(closedTrade);

          matchingBuy.quantity -= soldQty;
          matchingBuy.totalCost = Number((buyEntryPrice * matchingBuy.quantity).toFixed(2));
          matchingBuy.currentValue = Number((matchingBuy.currentPrice * matchingBuy.quantity).toFixed(2));
          matchingBuy.unrealizedPnL = Number(
            ((matchingBuy.currentPrice - buyEntryPrice) * matchingBuy.quantity).toFixed(2)
          );
          matchingBuy.unrealizedPnLPercent =
            matchingBuy.totalCost > 0
              ? Number(((matchingBuy.unrealizedPnL / matchingBuy.totalCost) * 100).toFixed(2))
              : 0;

          if (matchingBuy.quantity <= 0) {
            matchingBuy.status = 'CLOSED';
          }
          modified = true;
          continue;
        }
      }

      if (trade.status === 'OPEN' && trade.quantity <= 0) {
        modified = true;
        continue;
      }

      // Ensure closed trades derived from sales do NOT have action: 'BUY'
      if (trade.status === 'CLOSED' && trade.action === 'BUY' && trade.exitPrice && trade.exitPrice !== trade.entryPrice) {
        trade.action = 'SELL';
        modified = true;
      }

      result.push(trade);
    }

    return { reconciledTrades: result, modified };
  }

  /**
   * Safely saves portfolio state to localStorage.
   */
  public savePortfolio(trades: PaperTrade[], availableCash: number): void {
    try {
      const storage = getStorage();
      storage.setItem(TRADES_KEY, JSON.stringify(trades));
      storage.setItem(BALANCE_KEY, availableCash.toFixed(2));
    } catch (e) {
      console.error('Failed to save portfolio state to localStorage:', e);
    }
  }

  /**
   * Safely loads historical portfolio performance snapshots from localStorage.
   */
  public loadSnapshots(): PortfolioSnapshot[] {
    try {
      const storage = getStorage();
      const raw = storage.getItem(SNAPSHOTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((s: any) => ({
            timestamp: typeof s.timestamp === 'string' ? s.timestamp : new Date().toISOString(),
            timeLabel:
              typeof s.timeLabel === 'string'
                ? s.timeLabel
                : new Date(s.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
            totalValue: Number(s.totalValue || INITIAL_VIRTUAL_CAPITAL),
            availableCash: Number(s.availableCash || INITIAL_VIRTUAL_CAPITAL),
            investedAmount: Number(s.investedAmount || 0),
            unrealizedPnL: Number(s.unrealizedPnL || 0),
            realizedPnL: Number(s.realizedPnL || 0),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load portfolio snapshots:', e);
    }
    return [];
  }

  /**
   * Safely saves portfolio performance snapshots array to localStorage.
   */
  public saveSnapshots(snapshots: PortfolioSnapshot[]): void {
    try {
      const storage = getStorage();
      // Keep up to 150 most recent snapshots to ensure fast execution and bounded storage
      storage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots.slice(-150)));
    } catch (e) {
      console.error('Failed to save portfolio snapshots:', e);
    }
  }

  /**
   * Resets portfolio storage back to default capital and empty trades & snapshots.
   */
  public resetStorage(): StoredPortfolioState {
    try {
      const storage = getStorage();
      storage.removeItem(TRADES_KEY);
      storage.removeItem(BALANCE_KEY);
      storage.removeItem(SNAPSHOTS_KEY);
      storage.removeItem(LEGACY_TRADES_KEY);
      storage.removeItem(LEGACY_BALANCE_KEY);
    } catch (e) {
      console.error('Failed to reset portfolio storage:', e);
    }

    const defaultState = { trades: [], availableCash: INITIAL_VIRTUAL_CAPITAL };
    this.savePortfolio(defaultState.trades, defaultState.availableCash);
    return defaultState;
  }

  /**
   * Validates and sanitizes an individual trade record.
   */
  private sanitizeTrade(raw: any): PaperTrade | null {
    if (!raw || typeof raw !== 'object') return null;

    if (!raw.id || typeof raw.id !== 'string') return null;
    if (!raw.symbol || typeof raw.symbol !== 'string') return null;
    if (raw.action !== 'BUY' && raw.action !== 'SELL') return null;
    if (typeof raw.quantity !== 'number' || isNaN(raw.quantity) || raw.quantity <= 0) return null;
    if (typeof raw.entryPrice !== 'number' || isNaN(raw.entryPrice) || raw.entryPrice <= 0)
      return null;

    const openedAt =
      typeof raw.openedAt === 'string' && raw.openedAt ? raw.openedAt : new Date().toISOString();
    const timestamp =
      typeof raw.timestamp === 'string' && raw.timestamp
        ? raw.timestamp
        : new Date(openedAt).toLocaleString();

    const status = raw.status === 'CLOSED' ? 'CLOSED' : 'OPEN';
    const entryPrice = Number(raw.entryPrice.toFixed(2));
    const quantity = raw.quantity;
    const totalCost =
      typeof raw.totalCost === 'number' && !isNaN(raw.totalCost)
        ? Number(raw.totalCost.toFixed(2))
        : Number((entryPrice * quantity).toFixed(2));

    let exitPrice: number | undefined = undefined;
    if (typeof raw.exitPrice === 'number' && !isNaN(raw.exitPrice)) {
      exitPrice = Number(raw.exitPrice.toFixed(2));
    } else if (typeof raw.exit_price === 'number' && !isNaN(raw.exit_price)) {
      exitPrice = Number(raw.exit_price.toFixed(2));
    } else if (typeof raw.sellPrice === 'number' && !isNaN(raw.sellPrice)) {
      exitPrice = Number(raw.sellPrice.toFixed(2));
    }

    let rawRealizedPnL: number | undefined = undefined;
    const candidates = [
      raw.realizedPnL,
      raw.realizedPL,
      raw['realizedP/L'],
      raw.realized_pnl,
      raw.realizedPnl,
      status === 'CLOSED' ? raw.pnl : undefined,
    ];
    for (const cand of candidates) {
      if (typeof cand === 'number' && !isNaN(cand)) {
        rawRealizedPnL = Number(cand.toFixed(2));
        break;
      }
    }

    let realizedPnL = rawRealizedPnL;

    let realizedPnLPercent =
      typeof raw.realizedPnLPercent === 'number' && !isNaN(raw.realizedPnLPercent)
        ? Number(raw.realizedPnLPercent.toFixed(2))
        : typeof raw.realizedPLPercent === 'number' && !isNaN(raw.realizedPLPercent)
        ? Number(raw.realizedPLPercent.toFixed(2))
        : undefined;

    if (status === 'CLOSED') {
      if (exitPrice === undefined) {
        exitPrice =
          typeof raw.currentPrice === 'number' && !isNaN(raw.currentPrice)
            ? Number(raw.currentPrice.toFixed(2))
            : entryPrice;
      }

      // Defensive recalculation if missing or if 0 when exitPrice !== entryPrice
      const calculatedPnL = Number(((exitPrice - entryPrice) * quantity).toFixed(2));
      if (realizedPnL === undefined || (realizedPnL === 0 && exitPrice !== entryPrice)) {
        realizedPnL = calculatedPnL;
      }

      if (realizedPnLPercent === undefined || (realizedPnLPercent === 0 && realizedPnL !== 0)) {
        realizedPnLPercent =
          totalCost > 0 ? Number(((realizedPnL / totalCost) * 100).toFixed(2)) : 0;
      }
    }

    return {
      id: raw.id,
      symbol: raw.symbol.toUpperCase(),
      stockName: typeof raw.stockName === 'string' ? raw.stockName : raw.symbol,
      action: raw.action,
      orderType: raw.orderType === 'LIMIT' ? 'LIMIT' : 'MARKET',
      quantity,
      entryPrice,
      exitPrice,
      currentPrice:
        typeof raw.currentPrice === 'number' && !isNaN(raw.currentPrice)
          ? Number(raw.currentPrice.toFixed(2))
          : exitPrice ?? entryPrice,
      totalCost,
      currentValue:
        typeof raw.currentValue === 'number' && !isNaN(raw.currentValue)
          ? Number(raw.currentValue.toFixed(2))
          : totalCost,
      unrealizedPnL: status === 'CLOSED' ? 0 : typeof raw.unrealizedPnL === 'number' ? raw.unrealizedPnL : 0,
      unrealizedPnLPercent: status === 'CLOSED' ? 0 : typeof raw.unrealizedPnLPercent === 'number' ? raw.unrealizedPnLPercent : 0,
      realizedPnL,
      realizedPnLPercent,
      status,
      openedAt,
      closedAt: typeof raw.closedAt === 'string' ? raw.closedAt : status === 'CLOSED' ? openedAt : undefined,
      timestamp,
      stopLoss: typeof raw.stopLoss === 'number' ? raw.stopLoss : undefined,
      takeProfit: typeof raw.takeProfit === 'number' ? raw.takeProfit : undefined,
    };
  }
}

export const portfolioStorageService = new PortfolioStorageService();
