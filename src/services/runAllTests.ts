import { execSync } from 'child_process';

console.log('================================================================');
console.log('🚀 EXECUTING TRADEAI COMPREHENSIVE AUTOMATED VERIFICATION SUITE');
console.log('================================================================\n');

const suites = [
  { name: '1. Paper Trading & Double-Entry Accounting Suite', file: 'src/services/paperTradingService.test.ts' },
  { name: '2. Robustness Validation Engine Suite', file: 'src/services/robustnessValidationEngine.test.ts' },
  { name: '3. Benchmark Comparison Engine Suite', file: 'src/services/benchmarkComparisonEngine.test.ts' },
  { name: '4. Real-Data Walk-Forward Engine Suite', file: 'src/services/realDataWalkForwardEngine.test.ts' },
  { name: '5. Real Market Data Adapter & Paper Observation Pipeline Suite', file: 'src/services/realDataMarketObservation.test.ts' },
];

let allPassed = true;

for (const suite of suites) {
  console.log(`\n▶ Running: ${suite.name}...`);
  try {
    const output = execSync(`npx tsx ${suite.file}`, { encoding: 'utf8' });
    console.log(output.trim());
    console.log(`✅ ${suite.name} PASSED.`);
  } catch (err: any) {
    console.error(`❌ ${suite.name} FAILED:`, err.stdout || err.message);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error('\n❌ SOME TEST SUITES FAILED.');
  process.exit(1);
} else {
  console.log('\n================================================================');
  console.log('🎉 ALL 5 TEST SUITES COMPLETED AND VERIFIED 100% GREEN!');
  console.log('================================================================\n');
}
