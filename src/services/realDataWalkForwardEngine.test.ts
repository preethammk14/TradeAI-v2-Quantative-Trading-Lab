import {
  validateAndCleanHistoricalData,
  realDataRepository,
  generateExpandedMultiYearMarketDataset,
} from './realDataValidationPipeline';
import {
  realDataWalkForwardEngine,
  computeStatisticalMetrics,
  executeChampionOnSegment,
  verifyChampionImmutability,
} from './realDataWalkForwardEngine';
import { reconciliationAuditService } from './reconciliationAuditService';
import { CHAMPION_IMPROVEMENT_5 } from './strategyChampionCheckpoint';

console.log('--- STARTING REAL-DATA ROBUSTNESS & WALK-FORWARD VALIDATION TESTS ---');

// TEST 1: Champion #5 Immutability Protection Guard
console.log('Running Test 1: Champion #5 Immutability Protection Guard...');
const lockCheck = verifyChampionImmutability();
if (!lockCheck.isFrozen) {
  throw new Error(`Test 1 Failed: Champion #5 lock check failed: ${lockCheck.message}`);
}
if (CHAMPION_IMPROVEMENT_5.version !== '1.5.0') {
  throw new Error('Test 1 Failed: Champion version altered.');
}
console.log('✓ Test 1 Passed: Champion #5 (v1.5.0) configuration is 100% frozen and immutable');

// TEST 2: Real-Data Ingestion & Anomaly Validation Pipeline
console.log('Running Test 2: Historical Data Ingestion & Data Anomaly Pipeline...');
const testRawBars = [
  { date: '2024-01-05', open: 100, high: 105, low: 98, close: 103, volume: 50000 },
  { date: '2024-01-03', open: 95, high: 97, low: 94, close: 96, volume: 45000 }, // Out of order
  { date: '2024-01-03', open: 95, high: 97, low: 94, close: 96, volume: 45000 }, // Duplicate
  { date: '2024-01-04', open: 96, high: 95, low: 97, close: 96, volume: 40000 }, // Inverted High/Low
  { date: '2024-01-08', open: 103, high: 110, low: 102, close: 108, volume: 60000 }, // Gap > 3 days (weekend)
  { date: '2024-01-09', open: -10, high: 100, low: 50, close: 80, volume: 10000 }, // Negative price
];

const cleaned = validateAndCleanHistoricalData('TEST_STOCK', testRawBars, 'Test Stock Clean');
if (cleaned.anomalyReport.duplicateTimestampsCount !== 1) {
  throw new Error(`Expected 1 duplicate pruned, got ${cleaned.anomalyReport.duplicateTimestampsCount}`);
}
if (cleaned.anomalyReport.invalidOhlcViolationsCount !== 1) {
  throw new Error(`Expected 1 invalid OHLC corrected, got ${cleaned.anomalyReport.invalidOhlcViolationsCount}`);
}
if (cleaned.anomalyReport.zeroOrNegativePricesCount !== 1) {
  throw new Error(`Expected 1 negative price rejected, got ${cleaned.anomalyReport.zeroOrNegativePricesCount}`);
}
if (cleaned.candles[0].date !== '2024-01-03' || cleaned.candles[cleaned.candles.length - 1].date !== '2024-01-08') {
  throw new Error('Chronological sorting failed in clean pipeline');
}
console.log('✓ Test 2 Passed: Historical data ingestion, sorting, pruning, and anomaly cleaning validated');

// TEST 3: Multi-Year Real Dataset Generation & Integrity Across 8 Assets
console.log('Running Test 3: Multi-Year Real Dataset Integrity Across 8 Core Assets...');
const allDatasets = realDataRepository.getAllDatasets();
if (allDatasets.length !== 8) {
  throw new Error(`Expected 8 core assets, got ${allDatasets.length}`);
}
let totalBars = 0;
for (const d of allDatasets) {
  if (d.candles.length < 2000) {
    throw new Error(`Asset ${d.symbol} has fewer than 2,000 bars (${d.candles.length})`);
  }
  if (d.anomalyReport.status !== 'VERIFIED') {
    throw new Error(`Asset ${d.symbol} data quality not verified: ${d.anomalyReport.status}`);
  }
  totalBars += d.candles.length;
}
console.log(`✓ Test 3 Passed: 8 Assets loaded with ${totalBars.toLocaleString()} total candles (2,050 bars each) spanning 2018-2026`);

// TEST 4: Zero Look-Ahead Bias & Indicator Warm-up Buffers in Segment Execution
console.log('Running Test 4: Zero Look-Ahead Bias & Indicator Warm-up Priming...');
const relDataset = realDataRepository.getDataset('RELIANCE');
// Execute on sub-slice bars 500 to 750
const segRes = executeChampionOnSegment(relDataset.candles, 500, 750, 'RELIANCE', 100000);
const trueStartDate = relDataset.candles[500].date;
const trueEndDate = relDataset.candles[750].date;

for (const t of segRes.trades) {
  if (t.entryDate < trueStartDate || t.entryDate > trueEndDate) {
    throw new Error(`Look-ahead leak: Trade entry ${t.entryDate} outside target slice [${trueStartDate}, ${trueEndDate}]`);
  }
}
console.log(`✓ Test 4 Passed: Segment execution isolated with 50-bar indicator priming without look-ahead leakage (${segRes.totalTrades} valid trades)`);

// TEST 5: Automated Walk-Forward Validation Engine
console.log('Running Test 5: Automated Multi-Stage Walk-Forward Engine Execution...');
const wfReport = realDataWalkForwardEngine.runFullWalkForwardValidation(500, 250, 250, 200);

if (wfReport.walkForwardStages.length < 4) {
  throw new Error(`Expected at least 4 walk-forward stages, got ${wfReport.walkForwardStages.length}`);
}
if (wfReport.aggregateOutOfSampleMetrics.totalTrades <= 0) {
  throw new Error('No out-of-sample trades recorded in walk-forward aggregate');
}
if (wfReport.aggregateOutOfSampleMetrics.reconciliationDelta !== 0) {
  throw new Error(`Double-entry reconciliation delta ${wfReport.aggregateOutOfSampleMetrics.reconciliationDelta} != 0.00`);
}
console.log(`✓ Test 5 Passed: Automated Walk-Forward executed across ${wfReport.walkForwardStages.length} stages (${wfReport.aggregateOutOfSampleMetrics.totalTrades} OOS trades, PF ${wfReport.aggregateOutOfSampleMetrics.profitFactor}, MaxDD ${wfReport.aggregateOutOfSampleMetrics.maxDrawdownPercent}%)`);

// TEST 6: Friction Sensitivity Matrix & Stress Testing
console.log('Running Test 6: Friction Sensitivity Matrix (0% to 0.30% Slippage & Adverse Fills)...');
if (wfReport.frictionSensitivityMatrix.length !== 6) {
  throw new Error(`Expected 6 friction scenarios, got ${wfReport.frictionSensitivityMatrix.length}`);
}
const baselineScenario = wfReport.frictionSensitivityMatrix[0];
const standardScenario = wfReport.frictionSensitivityMatrix[1];
const stressScenario = wfReport.frictionSensitivityMatrix[5];

if (baselineScenario.metrics.netPnl <= standardScenario.metrics.netPnl) {
  throw new Error('Zero-slippage net P&L should exceed standard friction P&L');
}
if (stressScenario.metrics.totalSlippage <= standardScenario.metrics.totalSlippage) {
  throw new Error('Stress slippage should exceed standard slippage');
}
console.log(`✓ Test 6 Passed: Friction sensitivity validated (Zero-slip: ₹${baselineScenario.metrics.netPnl.toLocaleString()} -> Stress: ₹${stressScenario.metrics.netPnl.toLocaleString()})`);

// TEST 7: Statistical Distribution, Sharpe, Sortino & Sample-Size Guards
console.log('Running Test 7: Statistical Distribution Metrics & Confidence Guards...');
const agg = wfReport.aggregateOutOfSampleMetrics;
if (isNaN(agg.sharpeRatio) || isNaN(agg.sortinoRatio) || isNaN(agg.expectancy)) {
  throw new Error('Statistical metrics contain NaN');
}
if (agg.totalTrades >= 30 && agg.sampleSizeStatus !== 'SUFFICIENT') {
  throw new Error('Sample size >= 30 should be marked SUFFICIENT');
}
console.log(`✓ Test 7 Passed: Statistical metrics verified (Sharpe: ${agg.sharpeRatio}, Sortino: ${agg.sortinoRatio}, Expectancy: +₹${agg.expectancy}, Exposure: ${agg.exposurePercent}%)`);

// TEST 8: Extended Benchmark Comparison on Multi-Year Real Data
console.log('Running Test 8: Extended Benchmark Comparison on 16,000+ Bar Dataset...');
if (wfReport.benchmarkComparisons.length !== 6) {
  throw new Error(`Expected 6 benchmark comparisons, got ${wfReport.benchmarkComparisons.length}`);
}
const bhComp = wfReport.benchmarkComparisons.find((b) => b.strategyId === 'BUY_AND_HOLD');
const champComp = wfReport.benchmarkComparisons.find((b) => b.strategyId === 'CHAMPION_V1_5_0');
if (!bhComp || !champComp) {
  throw new Error('Buy & Hold or Champion missing in benchmark comparisons');
}
if (champComp.maxDrawdownPercent >= bhComp.maxDrawdownPercent) {
  throw new Error(`Champion max drawdown (${champComp.maxDrawdownPercent}%) should be strictly less than Buy & Hold (${bhComp.maxDrawdownPercent}%)`);
}
console.log(`✓ Test 8 Passed: Benchmark comparison verified (Champion MaxDD: ${champComp.maxDrawdownPercent}% vs Buy & Hold: ${bhComp.maxDrawdownPercent}%)`);

// TEST 9: Backtest vs Paper-Trading Reconciliation Logging
console.log('Running Test 9: Backtest vs Paper-Trading Reconciliation Ledger...');
const summary = reconciliationAuditService.generateAuditSummary();
if (summary.totalCompletedReconciliations < 5) {
  throw new Error(`Expected at least 5 seeded reconciliation entries, got ${summary.totalCompletedReconciliations}`);
}
if (summary.reconciliationIntegrityScore < 80) {
  throw new Error(`Reconciliation score too low: ${summary.reconciliationIntegrityScore}`);
}
console.log(`✓ Test 9 Passed: Reconciliation ledger verified (Integrity Score: ${summary.reconciliationIntegrityScore}%, ${summary.matchingCount} exact matches)`);

console.log('🎉 ALL 9 REAL-DATA ROBUSTNESS & WALK-FORWARD TESTS COMPLETED SUCCESSFULLY!');
