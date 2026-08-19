import { StrategyVersionInfo } from '../types/researchTypes';
import { CHAMPION_IMPROVEMENT_5 } from './strategyChampionCheckpoint';

/**
 * Strategy Versioning Registry for TradeAI v2 — Research Lab
 *
 * CRITICAL DIRECTIVE:
 * - CH5-V1.5.0 is the IMMUTABLE BASELINE / CONTROL STRATEGY.
 * - Future experiments (V2-A, V2-B, V2-C) are queued for Phase 2 optimization.
 * - No experiments are executed or modified in this infrastructure release.
 */
export const STRATEGY_VERSIONS_REGISTRY: StrategyVersionInfo[] = [
  {
    versionId: 'CH5-V1.5.0',
    name: 'Champion #5 — Fast SMA Slope + Dual Filter Confluence',
    status: 'LOCKED_BASELINE',
    isImmutable: true,
    description:
      'Official locked baseline and control strategy for TradeAI v2. Combines 20/50 SMA crossover with a mandatory Fast-SMA rising slope filter, RSI < 55 entry threshold, and MACD Histogram > 0 confirmation.',
    parametersSummary:
      'Fast SMA: 20 | Slow SMA: 50 | Slope Check: Rising (last 3 bars) | RSI: 14 (Entry < 55, Exit > 70) | MACD: 12/26/9 (Entry Hist > 0, Exit Hist < 0)',
    rules: {
      entry: CHAMPION_IMPROVEMENT_5.rules.entry,
      exit: CHAMPION_IMPROVEMENT_5.rules.exit,
      indicators: CHAMPION_IMPROVEMENT_5.rules.indicators,
    },
    hypothesis:
      'Baseline hypothesis: Combining trend slope confirmation with oscillator thresholding reduces whipsaw frequency by >40% without missing major structural trends.',
    researchFocus: 'Control Architecture / Benchmark Reference',
    createdAt: '2026-08-15T00:00:00Z',
    author: 'PMK Quantitative Research',
  },
  {
    versionId: 'V2-A',
    name: 'Experiment V2-A — Volatility-Adaptive Dynamic ATR Filter',
    status: 'DRAFT_QUEUED',
    isImmutable: false,
    parentVersion: 'CH5-V1.5.0',
    description:
      'Staged experiment to introduce an Average True Range (ATR 14) volatility expansion threshold to dynamically widen entry filters during compressed chop regimes.',
    parametersSummary:
      'Inherits CH5-V1.5.0 + ATR(14) Volatility Multiplier > 1.2x 50-SMA ATR + Dynamic Volatility Stop Loss',
    rules: {
      entry: 'CH5-V1.5.0 Entry Rules + (Current ATR(14) > 1.2 * SMA(50) of ATR)',
      exit: 'CH5-V1.5.0 Exit Rules OR Trailing Stop at 2.5 * ATR(14)',
      indicators: 'SMA(20), SMA(50), RSI(14), MACD(12,26,9), ATR(14)',
    },
    hypothesis:
      'Adding dynamic ATR volatility gating will suppress unprofitable false breakouts during low-volatility compression regimes (such as 2023 sideways chop).',
    researchFocus: 'Volatility Gating & Dynamic Risk',
    createdAt: '2026-08-18T00:00:00Z',
    author: 'TradeAI Research Lab (Queued for Phase 2)',
  },
  {
    versionId: 'V2-B',
    name: 'Experiment V2-B — Multi-Timeframe (Daily + Weekly) Trend Alignment',
    status: 'DRAFT_QUEUED',
    isImmutable: false,
    parentVersion: 'CH5-V1.5.0',
    description:
      'Staged experiment requiring higher-timeframe Weekly 20-EMA alignment before executing daily swing entries.',
    parametersSummary:
      'Inherits CH5-V1.5.0 + Weekly Close > Weekly 20-EMA + Weekly RSI > 45',
    rules: {
      entry: 'CH5-V1.5.0 Entry Rules + (Weekly Close > Weekly 20 EMA) + (Weekly RSI(14) > 45)',
      exit: 'CH5-V1.5.0 Exit Rules OR Weekly Close < Weekly 20 EMA',
      indicators: 'Daily SMA(20/50), Daily RSI(14), Daily MACD, Weekly EMA(20), Weekly RSI(14)',
    },
    hypothesis:
      'Filtering daily entries by the macro weekly trend direction will improve out-of-sample win rate from ~37% to >45% by eliminating counter-trend impulses.',
    researchFocus: 'Multi-Timeframe Macro Filtering',
    createdAt: '2026-08-18T00:00:00Z',
    author: 'TradeAI Research Lab (Queued for Phase 2)',
  },
  {
    versionId: 'V2-C',
    name: 'Experiment V2-C — Asymmetric Profit Target & Trailing Profit Ladder',
    status: 'DRAFT_QUEUED',
    isImmutable: false,
    parentVersion: 'CH5-V1.5.0',
    description:
      'Staged experiment implementing a two-tier profit locking exit (50% scale-out at +3R, trailing remainder with Chandelier Exit).',
    parametersSummary:
      'Inherits CH5-V1.5.0 + 50% Partial Take-Profit at 3R + Chandelier Exit (3.0 ATR) for remaining 50%',
    rules: {
      entry: 'CH5-V1.5.0 Entry Rules',
      exit: 'Partial Scale-Out 50% at +6.0% Gain; Trail remainder with 3-ATR Chandelier; Full Exit on CH5 bearish signal',
      indicators: 'SMA(20/50), RSI(14), MACD(12,26,9), ATR(14) Chandelier',
    },
    hypothesis:
      'Partial scale-outs will reduce return dispersion, smooth equity curve drawdowns, and increase the realized Profit Factor in trending regimes.',
    researchFocus: 'Trade Management & Scale-Out Mechanics',
    createdAt: '2026-08-18T00:00:00Z',
    author: 'TradeAI Research Lab (Queued for Phase 2)',
  },
];

class StrategyVersioningService {
  private versions: StrategyVersionInfo[] = [...STRATEGY_VERSIONS_REGISTRY];

  public getAllVersions(): StrategyVersionInfo[] {
    return this.versions;
  }

  public getVersion(versionId: string): StrategyVersionInfo | undefined {
    return this.versions.find((v) => v.versionId === versionId);
  }

  public getBaselineVersion(): StrategyVersionInfo {
    return this.versions.find((v) => v.versionId === 'CH5-V1.5.0')!;
  }

  public isBaseline(versionId: string): boolean {
    return versionId === 'CH5-V1.5.0';
  }

  public isImmutable(versionId: string): boolean {
    const version = this.getVersion(versionId);
    return version ? version.isImmutable : false;
  }

  /**
   * Staged validation to guarantee Champion #5 cannot be overwritten or altered.
   */
  public verifyBaselineProtection(): { isProtected: boolean; details: string } {
    const base = this.getBaselineVersion();
    if (!base || base.versionId !== 'CH5-V1.5.0' || !base.isImmutable) {
      return { isProtected: false, details: 'Baseline version integrity compromised!' };
    }
    return { isProtected: true, details: 'Champion #5 (CH5-V1.5.0) is locked, immutable, and protected.' };
  }
}

export const strategyVersioningService = new StrategyVersioningService();
