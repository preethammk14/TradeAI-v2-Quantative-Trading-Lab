import { MOCK_STOCKS, getStockBySymbol } from '../data/mockStocks';
import { PricePoint, StockQuote, Timeframe } from '../types';

export class MarketDataService {
  /**
   * Fetch all default monitored stocks
   */
  public async getStockQuotes(): Promise<StockQuote[]> {
    try {
      const response = await fetch('/api/market/stocks');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Fallback gracefully
    }
    return MOCK_STOCKS;
  }

  /**
   * Get quote and historical data for a specific symbol
   */
  public async getStockDetails(symbol: string): Promise<StockQuote> {
    try {
      const response = await fetch(`/api/market/stock/${encodeURIComponent(symbol)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.symbol) return data;
      }
    } catch {
      // Fallback gracefully
    }
    return getStockBySymbol(symbol);
  }

  /**
   * Filter historical price points by timeframe
   */
  public filterHistoryByTimeframe(history: PricePoint[], timeframe: Timeframe): PricePoint[] {
    if (!history || history.length === 0) return [];
    let count = history.length;
    switch (timeframe) {
      case '1D':
        count = Math.min(10, history.length);
        break;
      case '1W':
        count = Math.min(20, history.length);
        break;
      case '1M':
        count = Math.min(30, history.length);
        break;
      case '3M':
        count = Math.min(90, history.length);
        break;
      case '1Y':
      default:
        count = history.length;
        break;
    }
    return history.slice(-count);
  }
}

export const marketDataService = new MarketDataService();
