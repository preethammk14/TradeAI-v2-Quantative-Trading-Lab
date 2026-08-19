import { ResultScopeTag, ResearchConfig } from '../types/researchTypes';

export interface ScopeMetadata {
  tag: ResultScopeTag;
  label: string;
  badgeLabel: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  description: string;
  methodologyType: 'IN_SAMPLE' | 'WALK_FORWARD_VAL' | 'UNSEEN_OUT_OF_SAMPLE' | 'BENCHMARK_CONTROL' | 'STRESS_TEST';
}

export const SCOPE_REGISTRY: Record<ResultScopeTag, ScopeMetadata> = {
  BACKTEST: {
    tag: 'BACKTEST',
    label: 'Backtest (In-Sample Simulation)',
    badgeLabel: 'BACKTEST',
    colorClass: 'amber-400',
    borderClass: 'border-amber-500/40',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    description: 'Single-asset historical simulation on historical in-sample data. Intended for parameter exploration.',
    methodologyType: 'IN_SAMPLE',
  },
  VALIDATION: {
    tag: 'VALIDATION',
    label: 'Validation (In-Sample / Tuning Window)',
    badgeLabel: 'VALIDATION',
    colorClass: 'sky-400',
    borderClass: 'border-sky-500/40',
    bgClass: 'bg-sky-500/10',
    textClass: 'text-sky-400',
    description: 'Training and parameter validation windows during walk-forward evaluation.',
    methodologyType: 'WALK_FORWARD_VAL',
  },
  OUT_OF_SAMPLE: {
    tag: 'OUT_OF_SAMPLE',
    label: 'Out-of-Sample (Unseen Real Data)',
    badgeLabel: 'OUT-OF-SAMPLE',
    colorClass: 'emerald-400',
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    description: 'True out-of-sample forward testing on unseen historical slices with strict zero look-ahead bias.',
    methodologyType: 'UNSEEN_OUT_OF_SAMPLE',
  },
  BENCHMARK: {
    tag: 'BENCHMARK',
    label: 'Benchmark (Control Strategy Comparison)',
    badgeLabel: 'BENCHMARK',
    colorClass: 'indigo-400',
    borderClass: 'border-indigo-500/40',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-400',
    description: 'Head-to-head multi-regime evaluation against 5 independent control strategies on standardized data.',
    methodologyType: 'BENCHMARK_CONTROL',
  },
  FRICTION_SENSITIVITY: {
    tag: 'FRICTION_SENSITIVITY',
    label: 'Friction Sensitivity (Stress Testing)',
    badgeLabel: 'FRICTION SENSITIVITY',
    colorClass: 'rose-400',
    borderClass: 'border-rose-500/40',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    description: 'Multi-tiered slippage, brokerage, and adverse execution stress testing across entire dataset.',
    methodologyType: 'STRESS_TEST',
  },
};

class MetricConsistencyService {
  public getScopeMetadata(scope: ResultScopeTag): ScopeMetadata {
    return SCOPE_REGISTRY[scope] || SCOPE_REGISTRY.BACKTEST;
  }

  /**
   * Validates whether a metric report or card is attempting to render metrics
   * from mismatched test scopes or datasets, returning a consistency report.
   */
  public checkMetricConsistency(
    expectedScope: ResultScopeTag,
    actualConfig?: ResearchConfig
  ): {
    isConsistent: boolean;
    warningMessage?: string;
    scopeMetadata: ScopeMetadata;
  } {
    const scopeMetadata = this.getScopeMetadata(expectedScope);

    if (!actualConfig) {
      return {
        isConsistent: true,
        scopeMetadata,
      };
    }

    if (actualConfig.scope !== expectedScope) {
      return {
        isConsistent: false,
        warningMessage: `Metric Scope Mismatch: Config scope (${actualConfig.scope}) does not match current view scope (${expectedScope}).`,
        scopeMetadata,
      };
    }

    return {
      isConsistent: true,
      scopeMetadata,
    };
  }
}

export const metricConsistencyService = new MetricConsistencyService();
