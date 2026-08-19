import { ResearchConfig, ResultScopeTag } from '../types/researchTypes';

/**
 * Standard Research Configurations for TradeAI v2 Research Lab.
 * Defines immutable reference configurations and helper methods.
 */
export const DEFAULT_CHAMPION_RESEARCH_CONFIG: ResearchConfig = {
  configId: 'CFG-CH5-STD-2026',
  configName: 'Champion #5 Standard Multi-Year Protocol (v1.5.0)',
  scope: 'OUT_OF_SAMPLE',
  strategyVersion: 'CH5-V1.5.0',
  datasetName: 'NSE / Nifty 50 High-Liquidity Core 8 Dataset',
  dateRange: {
    start: '2018-01-01',
    end: '2026-08-15',
  },
  numberOfCandles: '2,050 Daily Candles / Asset (16,400 Total)',
  assets: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'LT'],
  timeframe: '1D (Daily OHLCV)',
  initialCapital: 800000, // ₹100,000 per asset
  brokerage: '₹20.00 Flat per Order',
  taxes: '0.05% Turnover (STT + Exchange + SEBI + GST)',
  slippage: '0.05% Next-Bar Open Fill Execution',
  positionSizing: '100% Capital per Active Asset Slot (Max 1 Concurrent Position per Stock)',
  indicatorWarmUpPeriod: '50 Bars (Lookback Buffer for SMA 50 / MACD 26 / RSI 14)',
  trainingWindow: '500 Bars (~2.0 Years In-Sample Training)',
  validationWindow: '250 Bars (~1.0 Year Rolling Validation)',
  outOfSampleWindow: '250 Bars (~1.0 Year Unseen Out-of-Sample Forward Test)',
  stepWindow: '200 Bars (Sliding Window Step)',
  checksumSignature: 'SHA256-CH5-16400B-8A-LOCK-F94A2B',
  createdAt: '2026-08-15T00:00:00Z',
  notes: 'Official locked baseline research protocol for Champion #5 v1.5.0 walk-forward testing.',
};

export const BACKTEST_DEFAULT_RESEARCH_CONFIG: ResearchConfig = {
  configId: 'CFG-BACKTEST-SINGLE-2026',
  configName: 'Standard Single-Asset Historical Simulation Config',
  scope: 'BACKTEST',
  strategyVersion: 'CH5-V1.5.0',
  datasetName: 'NSE Historical Daily Equities Feed',
  dateRange: {
    start: '2025-08-18',
    end: '2026-08-18',
  },
  numberOfCandles: '252 Daily Candles (1Y In-Sample)',
  assets: ['RELIANCE'],
  timeframe: '1D (Daily OHLCV)',
  initialCapital: 100000,
  brokerage: '₹20.00 Flat per Order',
  taxes: '0.05% Turnover',
  slippage: '0.05% Slippage',
  positionSizing: '100% Single-Asset Equity Allocation',
  indicatorWarmUpPeriod: '50 Bars',
  trainingWindow: '252 Bars (Full Simulation Window)',
  validationWindow: 'N/A (Single-Period In-Sample)',
  outOfSampleWindow: 'N/A (Historical In-Sample)',
  checksumSignature: 'SHA256-BT-252B-SINGLE-77C18E',
  createdAt: '2026-08-18T00:00:00Z',
  notes: 'Single-asset exploratory backtest with explicit friction models.',
};

export const BENCHMARK_SUITE_RESEARCH_CONFIG: ResearchConfig = {
  configId: 'CFG-BENCHMARK-6STRAT-2026',
  configName: 'Independent 6-Strategy Multi-Regime Benchmark Protocol',
  scope: 'BENCHMARK',
  strategyVersion: 'CH5-V1.5.0 vs 5 Controls',
  datasetName: '8-Asset Multi-Regime Synthetic & Real Market History',
  dateRange: {
    start: '2022-06-01',
    end: '2026-08-15',
  },
  numberOfCandles: '1,050 Daily Candles / Asset (8,400 Total)',
  assets: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'LT'],
  timeframe: '1D (Daily OHLCV)',
  initialCapital: 800000,
  brokerage: '₹20.00 Flat per Order',
  taxes: '0.05% Turnover',
  slippage: '0.05% Next-Bar Open Fill',
  positionSizing: 'Equal Weight ₹100,000 per Asset Basket',
  indicatorWarmUpPeriod: '50 Bars',
  trainingWindow: '1,050 Bars (Full Cycle with 6 Sub-Regimes)',
  validationWindow: 'Cross-Regime Segmented Evaluation (300 Bars / Regime)',
  outOfSampleWindow: 'Flash Crash, High-Vol, and Bear Regimes',
  checksumSignature: 'SHA256-BM-8400B-6S-8A-33D981',
  createdAt: '2026-08-15T00:00:00Z',
  notes: 'Head-to-head comparison against Buy & Hold, SMA-Only, RSI-Only, MACD-Only, and SMA+RSI.',
};

export const FRICTION_SENSITIVITY_RESEARCH_CONFIG: ResearchConfig = {
  configId: 'CFG-FRICTION-STRESS-2026',
  configName: 'Friction & Adverse Execution Stress Matrix',
  scope: 'FRICTION_SENSITIVITY',
  strategyVersion: 'CH5-V1.5.0',
  datasetName: 'NSE 8-Asset Multi-Year Extended Dataset',
  dateRange: {
    start: '2018-01-01',
    end: '2026-08-15',
  },
  numberOfCandles: '2,050 Daily Candles / Asset (16,400 Total)',
  assets: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'LT'],
  timeframe: '1D (Daily OHLCV)',
  initialCapital: 800000,
  brokerage: '₹20.00 Flat per Order',
  taxes: '0.05% Turnover',
  slippage: '0.00% to 0.30% Stepped Slippage + Adverse Gap Fill',
  positionSizing: '100% Capital per Active Asset Slot',
  indicatorWarmUpPeriod: '50 Bars',
  trainingWindow: '500 Bars',
  validationWindow: '250 Bars',
  outOfSampleWindow: '250 Bars Across 6 Friction Tiers',
  checksumSignature: 'SHA256-FRIC-16400B-6TIERS-520B1C',
  createdAt: '2026-08-15T00:00:00Z',
  notes: 'Stress-testing strategy edge against severe brokerage, taxes, and high slippage.',
};

class ResearchConfigService {
  private activeConfig: ResearchConfig = { ...DEFAULT_CHAMPION_RESEARCH_CONFIG };

  public getChampionConfig(): ResearchConfig {
    return { ...DEFAULT_CHAMPION_RESEARCH_CONFIG };
  }

  public getBacktestConfig(symbol: string = 'RELIANCE', customOverrides?: Partial<ResearchConfig>): ResearchConfig {
    const configId = `CFG-BT-${symbol}-${Date.now().toString(36).toUpperCase()}`;
    return {
      ...BACKTEST_DEFAULT_RESEARCH_CONFIG,
      configId,
      assets: [symbol],
      checksumSignature: `SHA256-BT-${symbol}-` + Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      ...customOverrides,
    };
  }

  public getValidationConfig(): ResearchConfig {
    return { ...DEFAULT_CHAMPION_RESEARCH_CONFIG };
  }

  public getBenchmarkConfig(): ResearchConfig {
    return { ...BENCHMARK_SUITE_RESEARCH_CONFIG };
  }

  public getFrictionSensitivityConfig(): ResearchConfig {
    return { ...FRICTION_SENSITIVITY_RESEARCH_CONFIG };
  }

  public getActiveConfig(): ResearchConfig {
    return this.activeConfig;
  }

  public setActiveConfig(config: ResearchConfig): void {
    this.activeConfig = config;
  }

  /**
   * Generates a deterministic consistency signature string to bind metrics to exact configs.
   */
  public generateDatasetSignature(config: ResearchConfig): string {
    return `[${config.scope} | ${config.strategyVersion} | ${config.numberOfCandles} | Friction: Slip ${config.slippage}, Brok ${config.brokerage}]`;
  }
}

export const researchConfigService = new ResearchConfigService();
