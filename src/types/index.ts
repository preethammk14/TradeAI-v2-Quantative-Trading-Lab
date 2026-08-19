export * from './researchTypes';
import { ResearchConfig, ResultScopeTag } from './researchTypes';

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface PricePoint {
  timestamp: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma20?: number[];
  sma50?: number[];
  ema20?: number[];
  rsi14?: number[];
  macd?: {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  };
  bollingerBands?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap: string;
  peRatio: number;
  sparkline: number[];
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE-MARKET';
  history: PricePoint[];
}

export interface AiAnalysisResult {
  symbol: string;
  marketTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  aiSignal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedEntryZone: string;
  suggestedStopLoss: string;
  suggestedTakeProfit: string;
  riskRewardRatio: string;
  reasoning: string[];
  disclaimer: string;
  analyzedAt: string;
  isFallback?: boolean;
  fallbackNotice?: string;
  provider?: string;
}

export interface AiMarketSummaryResult {
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number; // 0 to 100
  strongestSectors: string[];
  weakestSectors: string[];
  keyObservations: string[];
  riskConsiderations: string[];
  summaryParagraph: string;
  generatedAt: string;
  isFallback?: boolean;
  fallbackNotice?: string;
  provider?: string;
}

export type TradeAction = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';

export interface PaperTrade {
  id: string;
  symbol: string;
  stockName: string;
  action: TradeAction;
  orderType: OrderType;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
  grossPnL?: number;
  brokerage?: number;
  fees?: number;
  slippage?: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  timestamp?: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PortfolioSummary {
  virtualBalance: number; // Initial e.g. 100000
  availableCash: number;
  investedAmount: number;
  totalValue: number; // Cash + Invested
  todayPnL: number;
  todayPnLPercent: number;
  overallPnL: number;
  overallPnLPercent: number;
  winRate: number;
  openPositionsCount: number;
  closedTradesCount?: number;
  totalTradesCount: number;
}

export interface PortfolioSnapshot {
  timestamp: string; // ISO String
  timeLabel: string; // Formatted time/date string
  totalValue: number;
  availableCash: number;
  investedAmount: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface HoldingAllocation {
  symbol: string;
  stockName: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  portfolioPercent: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface PortfolioAnalytics {
  totalPortfolioValue: number;
  initialCapital: number;
  availableCash: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPercent: number;

  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  todayPnL: number;

  openPositionsCount: number;
  closedTradesCount: number;
  totalTradesCount: number;
  buyOrdersCount: number;
  sellOrdersCount: number;
  winningClosedTradesCount: number;
  losingClosedTradesCount: number;
  winRatePercent: number;

  avgWinningTrade: number;
  avgLosingTrade: number;
  largestProfit: number;
  largestLoss: number;

  bestHolding?: { symbol: string; stockName: string; unrealizedPnL: number; unrealizedPnLPercent: number };
  worstHolding?: { symbol: string; stockName: string; unrealizedPnL: number; unrealizedPnLPercent: number };
  bestClosedTrade?: { symbol: string; stockName: string; realizedPnL: number; realizedPnLPercent: number };
  worstClosedTrade?: { symbol: string; stockName: string; realizedPnL: number; realizedPnLPercent: number };

  holdingsAllocation: HoldingAllocation[];

  cashAllocationPercent: number;
  investedAllocationPercent: number;
  largestPositionPercent: number;
  largestPositionSymbol?: string;
  concentrationLevel: 'Low Concentration' | 'Moderate Concentration' | 'High Concentration';
  diversificationStatus: string;
}

export type StrategyType =
  | 'SMA_CROSSOVER'
  | 'RSI_STRATEGY'
  | 'MACD_STRATEGY'
  | 'BOLLINGER_STRATEGY'
  | 'SMA_RSI_STRATEGY'
  | 'COMBINED_STRATEGY';

export interface BacktestParams {
  symbol: string;
  strategy: StrategyType;
  startingCapital: number;
  timeframe: Timeframe;
  // SMA Crossover parameters
  fastPeriod?: number; // 5-50 (default: 20)
  slowPeriod?: number; // 20-200 (default: 50)
  // RSI Reversal parameters
  rsiPeriod?: number; // 7-21 (default: 14)
  rsiOverbought?: number; // 60-80 (default: 70)
  rsiOversold?: number; // 20-40 (default: 30)
  // MACD parameters
  macdFastPeriod?: number; // 8-16 (default: 12)
  macdSlowPeriod?: number; // 20-30 (default: 26)
  macdSignalPeriod?: number; // 5-12 (default: 9)
  // Bollinger Bands parameters
  bollingerPeriod?: number; // 10-30 (default: 20)
  bollingerStdDev?: number; // 1.5-3.0 (default: 2.0)
  // Phase A: Friction & Transaction Cost Settings
  slippagePercent?: number; // e.g. 0.05% to 0.5%
  brokeragePerTrade?: number; // Flat fee per order (e.g. ₹20 or ₹0)
  regulatoryFeePercent?: number; // STT, exchange, SEBI turnover percentage (e.g. 0.05% or 0.1%)
  // Research & Audit Metadata
  strategyVersion?: string; // e.g. 'CH5-V1.5.0'
  researchConfig?: ResearchConfig;
}

export interface BacktestTrade {
  id: string;
  type: 'BUY' | 'SELL';
  entryDate: string;
  entryPrice: number;
  entryReason?: string;
  exitDate: string;
  exitPrice: number;
  exitReason?: string;
  quantity: number;
  holdingDays: number;
  grossPnl: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
  slippagePaid?: number;
  brokeragePaid?: number;
  regulatoryFeesPaid?: number;
  totalFrictionPaid?: number;
  status: 'WIN' | 'LOSS' | 'BREAKEVEN';
}

export interface BacktestResult {
  symbol: string;
  strategyName: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  buyAndHoldReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  lossRate: number;
  breakevenRate: number;
  grossProfit: number;
  grossLoss: number;
  totalGrossPnl: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  largestWin: number;
  largestLoss: number;
  largestWinTrade?: BacktestTrade | null;
  largestLossTrade?: BacktestTrade | null;
  avgHoldingDays: number;
  longestHoldingDays: number;
  longestHoldingTrade?: BacktestTrade | null;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  avgTradeReturn: number;
  totalFrictionPaid?: number;
  slippagePercentUsed?: number;
  brokeragePerTradeUsed?: number;
  regulatoryFeePercentUsed?: number;
  equityCurve: { date: string; equity: number; buyAndHold: number }[];
  trades: BacktestTrade[];
  strategyVersion?: string;
  resultScope?: ResultScopeTag;
  researchConfig?: ResearchConfig;
}

export interface RiskCalculation {
  accountSize: number;
  riskPercentage: number;
  maxRiskAmount: number;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice?: number;
  stopLossDistance: number;
  stopLossDistancePercent: number;
  recommendedPositionSize: number;
  positionValue: number;
  potentialLoss: number;
  potentialGain?: number;
  riskRewardRatio?: string;
  warnings: string[];
}
