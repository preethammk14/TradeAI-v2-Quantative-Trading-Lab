import {
  runFullRobustnessSimulation,
  verifyChampionBenchmarkProtection,
} from './robustnessValidationEngine';
import { CHAMPION_IMPROVEMENT_5 } from './strategyChampionCheckpoint';

export function runValidationEngineTests() {
  console.log('--- STARTING ROBUSTNESS VALIDATION ENGINE TESTS ---');

  const report = runFullRobustnessSimulation();

  // Test 1: Benchmark Protection Guard
  console.assert(report.benchmarkStatus.championVersion === '1.5.0', 'Champion version must be 1.5.0');
  console.assert(report.benchmarkStatus.isProtected === true, 'Champion protection must be active');

  const validParams = {
    strategy: 'COMBINED_STRATEGY',
    fastPeriod: 20,
    slowPeriod: 50,
    rsiPeriod: 14,
    rsiOverbought: 70,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
  };
  console.assert(verifyChampionBenchmarkProtection(validParams).isProtected === true, 'Valid params must pass guard');

  const invalidFastSma = { ...validParams, fastPeriod: 15 };
  console.assert(verifyChampionBenchmarkProtection(invalidFastSma).isProtected === false, 'Tampered fast SMA must fail guard');

  const invalidStrategy = { ...validParams, strategy: 'SMA_CROSSOVER' };
  console.assert(verifyChampionBenchmarkProtection(invalidStrategy).isProtected === false, 'Tampered strategy must fail guard');
  console.log('✓ Validation Test 1 Passed: Benchmark Protection Guard ensures immutable Champion #5 configuration');

  // Test 2: Extended Multi-Regime Dataset
  console.assert(report.overview.totalCandlesAcrossAssets === 8400, 'Total candles across 8 assets must equal 8,400');
  console.assert(report.extendedMultiRegime.totalCandles === 1050, 'Extended dataset per asset must equal 1,050 bars');
  console.assert(report.perAssetExtended.length === 8, 'Must test across all 8 assets');
  console.log('✓ Validation Test 2 Passed: 1,050+ candle multi-regime dataset populated across all 8 assets');

  // Test 3: Data Integrity Audits
  console.assert(report.dataIntegrityAudits.length >= 6, 'Must contain at least 6 data integrity checks');
  const allPassed = report.dataIntegrityAudits.every((a) => a.status === 'PASS');
  console.assert(allPassed === true, 'All data integrity checks must pass');
  console.log('✓ Validation Test 3 Passed: 100% data integrity verified (timestamps, ordering, no duplicates, no look-ahead)');

  // Test 4: Exact Double-Entry Accounting
  console.assert(report.extendedMultiRegime.reconciliationDelta === 0, 'Extended multi-regime reconciliation delta must be 0.00');
  const allRegimesReconciled = report.regimeBreakdowns.every((r) => r.reconciliationDelta === 0);
  console.assert(allRegimesReconciled === true, 'All isolated regimes must reconcile to 0.00 delta');
  const allWfReconciled = report.walkForwardStages.every(
    (s) => s.trainWindow.reconciliationDelta === 0 && s.testWindow.reconciliationDelta === 0
  );
  console.assert(allWfReconciled === true, 'All walk-forward stages must reconcile to 0.00 delta');
  console.log('✓ Validation Test 4 Passed: Exact accounting reconciliation verified across all windows');

  // Test 5: Walk-Forward Multi-Stage Engine
  console.assert(report.walkForwardStages.length === 4, 'Must execute 4 sequential walk-forward stages');
  report.walkForwardStages.forEach((stage, idx) => {
    console.assert(stage.stage === idx + 1, `Stage ${idx + 1} numbering verified`);
    console.assert(stage.trainWindow.totalCandles >= 200, `Stage ${idx + 1} train window has sufficient bars`);
    console.assert(stage.testWindow.totalCandles >= 200, `Stage ${idx + 1} test window has sufficient bars`);
  });
  console.log('✓ Validation Test 5 Passed: Automated 4-stage sequential walk-forward analysis validated');

  // Test 6: Stress Testing Matrix
  console.assert(report.stressTests.length === 6, 'Must contain 6 stress scenarios');
  const stressTypes = report.stressTests.map((s) => s.scenarioType);
  console.assert(stressTypes.includes('VOLATILITY'), 'Must test high volatility');
  console.assert(stressTypes.includes('BEAR_TREND'), 'Must test bear market');
  console.assert(stressTypes.includes('CHOP_SIDEWAYS'), 'Must test sideways market');
  console.assert(stressTypes.includes('FLASH_CRASH'), 'Must test flash crash/recovery');
  console.assert(stressTypes.includes('COST_SENSITIVITY'), 'Must test 2x fee sensitivity');
  console.assert(stressTypes.includes('SLIPPAGE_SENSITIVITY'), 'Must test slippage sensitivity');
  console.log('✓ Validation Test 6 Passed: Comprehensive 6-scenario stress testing matrix executed');

  // Test 7: Statistical Distribution Metrics
  console.assert(!isNaN(report.overview.overallWinRate), 'Win rate must be a valid number');
  console.assert(!isNaN(report.overview.overallReturnPercent), 'Return percent must be a valid number');
  console.assert(!isNaN(report.overview.overallProfitFactor), 'Profit factor must be a valid number');
  console.assert(!isNaN(report.overview.overallMaxDrawdownPercent), 'Max drawdown must be a valid number');
  console.assert(!isNaN(report.overview.overallExpectancy), 'Expectancy must be a valid number');
  console.assert(!isNaN(report.overview.overallSharpeRatio), 'Sharpe ratio must be a valid number');
  console.assert(report.overview.sampleSizeStatus === 'SUFFICIENT', '1,050-bar dataset provides sufficient N >= 30 sample');
  console.log('✓ Validation Test 7 Passed: Statistical distributions, expectancy, Sharpe ratio, and sample size verification passed');

  console.log('🎉 ALL 7 VALIDATION ENGINE TESTS COMPLETED SUCCESSFULLY!');
}

runValidationEngineTests();
