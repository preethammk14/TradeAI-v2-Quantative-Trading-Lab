export type ResultScopeTag =
  | 'BACKTEST'
  | 'VALIDATION'
  | 'OUT_OF_SAMPLE'
  | 'BENCHMARK'
  | 'FRICTION_SENSITIVITY';

export interface ResearchConfig {
  configId: string;
  configName: string;
  scope: ResultScopeTag;
  strategyVersion: string;
  datasetName: string;
  dateRange: {
    start: string;
    end: string;
  };
  numberOfCandles: number | string;
  assets: string[];
  timeframe: string;
  initialCapital: number;
  brokerage: number | string;
  taxes: number | string;
  slippage: number | string;
  positionSizing: string;
  indicatorWarmUpPeriod: number | string;
  trainingWindow: number | string;
  validationWindow: number | string;
  outOfSampleWindow: number | string;
  stepWindow?: number | string;
  checksumSignature: string;
  createdAt: string;
  notes?: string;
}

export type StrategyVersionStatus =
  | 'LOCKED_BASELINE'
  | 'DRAFT_QUEUED'
  | 'ACTIVE_EXPERIMENT'
  | 'ARCHIVED';

export interface StrategyVersionInfo {
  versionId: string; // e.g. 'CH5-V1.5.0', 'V2-A', 'V2-B', 'V2-C'
  name: string;
  status: StrategyVersionStatus;
  isImmutable: boolean;
  parentVersion?: string;
  description: string;
  parametersSummary: string;
  rules: {
    entry: string;
    exit: string;
    indicators: string;
  };
  hypothesis?: string;
  researchFocus?: string;
  createdAt: string;
  author: string;
}

export interface ExperimentAuditLogEntry {
  id: string; // Unique experiment ID (e.g. 'EXP-20260818-CH5-BASE')
  strategyVersion: string;
  scope: ResultScopeTag;
  parameterChanges: string;
  dataset: string;
  frictionAssumptions: string;
  timestamp: string;
  configId: string;
  resultMetrics: {
    totalTrades: number;
    winRate: number;
    netPnl: number;
    returnPercent: number;
    profitFactor: number;
    maxDrawdownPercent: number;
    expectancy: number;
    sharpeRatio?: number;
    reconciliationDelta: number;
    statusText: string;
  };
  notes: string;
}
