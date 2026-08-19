export type MarketDataStatusType =
  | 'LIVE_MARKET_DATA'
  | 'DELAYED_MARKET_DATA'
  | 'DEMO_SYNTHETIC_DATA'
  | 'DATA_FEED_OFFLINE'
  | 'DATA_FEED_INVALID_PAUSED';

export type MarketDataMode = 'LIVE' | 'DELAYED' | 'SIMULATED' | 'OFFLINE';

export interface MarketDataProviderConfig {
  providerId: string;
  providerName: string;
  providerType: 'ALPHA_VANTAGE' | 'YAHOO_FINANCE' | 'CUSTOM_REST' | 'SIMULATED_REPLAY';
  apiKeyEnvVar?: string;
  isConfigured: boolean;
  status: MarketDataStatusType;
  dataMode: MarketDataMode;
  lastUpdateTimestamp: string;
  lastSuccessfulUpdateTimestamp: string | null;
  latencyMs: number | null;
  assetsReceivingDataCount: number;
  statusMessage: string;
  lastErrorMessage?: string | null;
  supportedSymbols: string[];
}

export interface LiveMarketFeedStatus {
  status: MarketDataStatusType;
  providerName: string;
  providerType: string;
  isConfigured: boolean;
  apiKeyEnvVar?: string;
  symbol?: string;
  latestPrice?: number | null;
  dataDelayMinutes?: number | null;
  lastUpdateTimestamp: string;
  lastSuccessfulUpdateTimestamp: string | null;
  latencyMs: number | null;
  assetsCount: number;
  statusMessage: string;
  dataMode: MarketDataMode;
  lastErrorMessage?: string | null;
  isPaperPaused: boolean;
  pauseReason?: string;
}

export interface ObservationSessionState {
  sessionId: string;
  isActive: boolean;
  startedAt: string;
  durationSeconds: number;
  totalSignalsGenerated: number;
  totalPaperTradesExecuted: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdownPercent: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  averageTradePnl: number;
  totalFeesPaid: number;
  totalSlippagePaid: number;
  dataQualityScore: number;
  averageSignalLatencyMs: number | null;
  status: 'OBSERVING' | 'PAUSED' | 'IDLE';
}

export interface RealtimeNormalizedCandle {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinalBar: boolean;
  feedLatencyMs: number | null;
  validationScore: number;
}

