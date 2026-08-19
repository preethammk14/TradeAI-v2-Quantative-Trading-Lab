import { PricePoint, StockQuote } from '../types';
import {
  LiveMarketFeedStatus,
  MarketDataProviderConfig,
  MarketDataStatusType,
  RealtimeNormalizedCandle,
} from '../types/marketFeedTypes';
import { MOCK_STOCKS, getStockBySymbol } from '../data/mockStocks';

export const SUPPORTED_INDIAN_EQUITIES = [
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'TATAMOTORS',
  'SBIN',
  'BHARTIARTL',
] as const;

export type SupportedIndianEquity = (typeof SUPPORTED_INDIAN_EQUITIES)[number];

/**
 * Agnostic Market Data Provider Interface
 * Decouples strategy signal engine from any specific broker or provider API.
 */
export interface IMarketDataProvider {
  readonly id: string;
  readonly name: string;
  readonly providerType: 'ALPHA_VANTAGE' | 'YAHOO_FINANCE' | 'CUSTOM_REST' | 'SIMULATED_REPLAY';
  readonly requiredEnvVar?: string;

  checkConnection(): Promise<LiveMarketFeedStatus>;
  fetchLatestQuotes(symbols: string[]): Promise<StockQuote[]>;
  fetchHistoricalCandles(symbol: string, days?: number): Promise<PricePoint[]>;
  pollLatestCandle(symbol: string): Promise<RealtimeNormalizedCandle | null>;
}

/**
 * 1. Alpha Vantage / Indian NSE/BSE Market Data Provider Adapter
 * Configurable via ALPHA_VANTAGE_API_KEY environment variable.
 */
export class AlphaVantageMarketDataProvider implements IMarketDataProvider {
  public readonly id = 'alpha-vantage';
  public readonly name = 'Alpha Vantage Equities API (NSE/BSE)';
  public readonly providerType = 'ALPHA_VANTAGE' as const;
  public readonly requiredEnvVar = 'ALPHA_VANTAGE_API_KEY';

  public async checkConnection(): Promise<LiveMarketFeedStatus> {
    try {
      const response = await fetch('/api/market/provider-status?provider=alpha-vantage');
      if (response.ok) {
        const data = await response.json();
        const isOffline = data.status === 'DATA_FEED_OFFLINE' || data.status === 'DEMO_SYNTHETIC_DATA' || !data.isConfigured;
        return {
          status: data.status || (data.isConfigured ? 'LIVE_MARKET_DATA' : 'DEMO_SYNTHETIC_DATA'),
          providerName: data.providerName || this.name,
          providerType: data.providerType || this.providerType,
          isConfigured: Boolean(data.isConfigured),
          apiKeyEnvVar: this.requiredEnvVar,
          symbol: data.symbol || 'RELIANCE.BSE',
          latestPrice: data.latestPrice !== undefined ? data.latestPrice : null,
          dataDelayMinutes: data.dataDelayMinutes !== undefined ? data.dataDelayMinutes : null,
          lastUpdateTimestamp: data.lastUpdateTimestamp || new Date().toISOString(),
          lastSuccessfulUpdateTimestamp: data.lastSuccessfulUpdateTimestamp || new Date().toISOString(),
          latencyMs: data.latencyMs ?? 12,
          assetsCount: data.assetsCount || 8,
          statusMessage: data.statusMessage || (data.isConfigured
            ? '🟢 LIVE MARKET DATA — Authenticated Feed Connected'
            : 'DEMO DATA MODE — LIVE DATA NOT CONNECTED'),
          dataMode: data.dataMode || (data.isConfigured ? 'LIVE' : 'SIMULATED'),
          lastErrorMessage: data.lastErrorMessage || null,
          isPaperPaused: data.isPaperPaused !== undefined ? data.isPaperPaused : false,
          pauseReason: data.pauseReason,
        };
      }
    } catch {
      // Backend not responding or network error
    }

    return {
      status: 'DEMO_SYNTHETIC_DATA',
      providerName: this.name,
      providerType: this.providerType,
      isConfigured: false,
      apiKeyEnvVar: this.requiredEnvVar,
      symbol: 'RELIANCE.BSE',
      latestPrice: null,
      dataDelayMinutes: null,
      lastUpdateTimestamp: new Date().toISOString(),
      lastSuccessfulUpdateTimestamp: new Date().toISOString(),
      latencyMs: 12,
      assetsCount: 8,
      statusMessage: 'DEMO DATA MODE — LIVE DATA NOT CONNECTED',
      dataMode: 'SIMULATED',
      lastErrorMessage: 'Alpha Vantage API key is not configured in server environment. Using deterministic demo data fallback.',
      isPaperPaused: false,
    };
  }

  public async fetchLatestQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      const response = await fetch('/api/market/real-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, provider: this.id }),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fallback
    }
    return symbols.map((s) => getStockBySymbol(s));
  }

  public async fetchHistoricalCandles(symbol: string, days: number = 250): Promise<PricePoint[]> {
    try {
      const response = await fetch(`/api/market/real-history/${encodeURIComponent(symbol)}?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fallback
    }
    return getStockBySymbol(symbol).history;
  }

  public async pollLatestCandle(symbol: string): Promise<RealtimeNormalizedCandle | null> {
    try {
      const response = await fetch(`/api/market/poll-candle/${encodeURIComponent(symbol)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.timestamp) return data;
      }
    } catch {
      // Fail safely
    }
    return null;
  }
}

/**
 * 2. Deterministic High-Fidelity Market Replay / Sandbox Provider
 * Explicitly labeled as DEMO_SYNTHETIC_DATA (never claims to be live).
 */
export class DeterministicMarketReplayProvider implements IMarketDataProvider {
  public readonly id = 'deterministic-replay';
  public readonly name = 'TradeAI Deterministic Historical Feed';
  public readonly providerType = 'SIMULATED_REPLAY' as const;

  public async checkConnection(): Promise<LiveMarketFeedStatus> {
    return {
      status: 'DEMO_SYNTHETIC_DATA',
      providerName: this.name,
      providerType: this.providerType,
      isConfigured: true,
      lastUpdateTimestamp: new Date().toISOString(),
      lastSuccessfulUpdateTimestamp: new Date().toISOString(),
      latencyMs: 12,
      assetsCount: SUPPORTED_INDIAN_EQUITIES.length,
      statusMessage: '🟠 DEMO / SYNTHETIC DATA: Calibrated historical price simulation for zero-risk paper trading observation.',
      dataMode: 'SIMULATED',
      lastErrorMessage: null,
      isPaperPaused: false,
    };
  }

  public async fetchLatestQuotes(symbols: string[]): Promise<StockQuote[]> {
    return symbols.map((sym) => getStockBySymbol(sym));
  }

  public async fetchHistoricalCandles(symbol: string, days: number = 250): Promise<PricePoint[]> {
    const stock = getStockBySymbol(symbol);
    return stock.history.slice(-days);
  }

  public async pollLatestCandle(symbol: string): Promise<RealtimeNormalizedCandle | null> {
    const stock = getStockBySymbol(symbol);
    if (!stock || stock.history.length === 0) return null;
    const latest = stock.history[stock.history.length - 1];
    return {
      symbol: stock.symbol,
      timestamp: latest.date || latest.timestamp,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      volume: latest.volume,
      isFinalBar: true,
      feedLatencyMs: 15,
      validationScore: 100,
    };
  }
}

/**
 * Master Market Data Manager
 * Directs incoming data to the Normalization & Integrity layers.
 */
export class MarketDataManager {
  private activeProvider: IMarketDataProvider;
  private fallbackProvider: IMarketDataProvider;
  private feedStatus: LiveMarketFeedStatus;

  constructor() {
    // Default to the Alpha Vantage Real Market Data Adapter
    this.activeProvider = new AlphaVantageMarketDataProvider();
    this.fallbackProvider = new DeterministicMarketReplayProvider();
    this.feedStatus = {
      status: 'DATA_FEED_OFFLINE',
      providerName: this.activeProvider.name,
      providerType: this.activeProvider.providerType,
      isConfigured: false,
      apiKeyEnvVar: 'ALPHA_VANTAGE_API_KEY',
      lastUpdateTimestamp: new Date().toISOString(),
      lastSuccessfulUpdateTimestamp: null,
      latencyMs: null,
      assetsCount: 0,
      statusMessage: 'Checking live market data connection...',
      dataMode: 'OFFLINE',
      lastErrorMessage: 'ALPHA_VANTAGE_API_KEY is not defined in server environment.',
      isPaperPaused: true,
      pauseReason: 'Live data provider credentials missing',
    };
  }

  public setProvider(provider: IMarketDataProvider) {
    this.activeProvider = provider;
  }

  public async refreshStatus(): Promise<LiveMarketFeedStatus> {
    const status = await this.activeProvider.checkConnection();
    this.feedStatus = status;
    return status;
  }

  public getStatus(): LiveMarketFeedStatus {
    return this.feedStatus;
  }

  public getActiveProvider(): IMarketDataProvider {
    return this.activeProvider;
  }

  public getFallbackProvider(): IMarketDataProvider {
    return this.fallbackProvider;
  }
}

export const marketDataManager = new MarketDataManager();
