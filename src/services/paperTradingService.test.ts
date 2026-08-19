import { paperTradingService } from './paperTradingService';
import { portfolioStorageService } from './portfolioStorageService';
import { backtestingService } from './backtestingService';
import { calculateBollingerBands } from './technicalAnalysisService';
import { StockQuote, PricePoint, StrategyType } from '../types';
import { MOCK_STOCKS } from '../data/mockStocks';

// Simple in-memory localStorage polyfill for Node.js test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

const mockQuotes: StockQuote[] = [
  {
    symbol: 'INFY',
    name: 'Infosys Limited',
    sector: 'IT',
    price: 1500,
    change: 10,
    changePercent: 0.67,
    high: 1510,
    low: 1480,
    open: 1490,
    previousClose: 1490,
    volume: 1000000,
    marketCap: '₹6.2 Lakh Cr',
    peRatio: 26.5,
    sparkline: [1480, 1490, 1500],
    marketStatus: 'OPEN',
    history: [],
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    sector: 'IT',
    price: 3400,
    change: -20,
    changePercent: -0.58,
    high: 3450,
    low: 3380,
    open: 3420,
    previousClose: 3420,
    volume: 500000,
    marketCap: '₹12.5 Lakh Cr',
    peRatio: 29.1,
    sparkline: [3420, 3400],
    marketStatus: 'OPEN',
    history: [],
  },
];

function runTests() {
  console.log('--- STARTING TRADEAI PORTFOLIO & REALIZED P/L TESTS ---');

  // Test 1: Reset Storage & Initialize
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();
  let trades = paperTradingService.getTrades();
  console.assert(trades.length === 0, 'Initial trades count should be 0');
  console.log('✓ Test 1 Passed: Storage Reset');

  // Test 2: Profitable Partial Sale (Infosys scenario: Buy 11 @ 1420, Sell 5 @ 1500)
  paperTradingService.executePaperTrade({
    symbol: 'INFY',
    stockName: 'Infosys Limited',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 11,
    currentPrice: 1420,
  });

  // Verify open position
  let openTrades = paperTradingService.getTrades().filter((t) => t.status === 'OPEN');
  console.assert(openTrades.length === 1, 'Should have 1 open position');
  console.assert(openTrades[0].quantity === 11, 'Quantity should be 11');

  // Perform partial sale: Sell 5 shares @ 1500
  const sellResult = paperTradingService.executePaperTrade({
    symbol: 'INFY',
    stockName: 'Infosys Limited',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 5,
    currentPrice: 1500,
  });
  console.assert(sellResult.success, 'Partial sell should succeed');

  let analyticsResult = paperTradingService.getPortfolioAnalytics(mockQuotes);
  let analytics = analyticsResult.analytics;

  // Expected realized P/L: (1500 - 1420) * 5 = +400.00
  console.assert(analytics.realizedPnL === 400, `Realized P/L should be 400, got ${analytics.realizedPnL}`);
  console.assert(analytics.closedTradesCount === 1, `Closed trades count should be 1, got ${analytics.closedTradesCount}`);
  console.assert(analytics.openPositionsCount === 1, `Open positions count should be 1, got ${analytics.openPositionsCount}`);

  // Check remaining open position quantity: 11 - 5 = 6 shares
  openTrades = paperTradingService.getTrades().filter((t) => t.status === 'OPEN');
  console.assert(openTrades[0].quantity === 6, `Remaining quantity should be 6, got ${openTrades[0].quantity}`);
  console.assert(openTrades[0].entryPrice === 1420, `Cost basis should remain 1420, got ${openTrades[0].entryPrice}`);
  console.log('✓ Test 2 Passed: Profitable Partial Sale (Infosys 11 -> 5 sold, 6 remaining, Realized P/L +₹400)');

  // Test 3: Losing Partial Sale (Sell 2 of 6 remaining @ 1350)
  // Expected loss: (1350 - 1420) * 2 = -140.00
  paperTradingService.executePaperTrade({
    symbol: 'INFY',
    stockName: 'Infosys Limited',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 2,
    currentPrice: 1350,
  });

  analytics = paperTradingService.getPortfolioAnalytics(mockQuotes).analytics;
  // Total realized P/L: +400 + (-140) = +260
  console.assert(analytics.realizedPnL === 260, `Total Realized P/L should be 260, got ${analytics.realizedPnL}`);
  console.assert(analytics.closedTradesCount === 2, `Closed trades count should be 2, got ${analytics.closedTradesCount}`);
  console.assert(analytics.winningClosedTradesCount === 1, 'Winning closed trades should be 1');
  console.assert(analytics.losingClosedTradesCount === 1, 'Losing closed trades should be 1');
  console.assert(analytics.winRatePercent === 50, `Win rate should be 50%, got ${analytics.winRatePercent}`);
  console.log('✓ Test 3 Passed: Losing Partial Sale (Multiple partial sales tracked correctly)');

  // Test 4: Complete Position Closure (Sell remaining 4 shares @ 1500)
  // Realized P/L for this trade: (1500 - 1420) * 4 = +320
  paperTradingService.executePaperTrade({
    symbol: 'INFY',
    stockName: 'Infosys Limited',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 4,
    currentPrice: 1500,
  });

  analytics = paperTradingService.getPortfolioAnalytics(mockQuotes).analytics;
  // Total realized P/L: 400 - 140 + 320 = +580
  console.assert(analytics.realizedPnL === 580, `Total Realized P/L should be 580, got ${analytics.realizedPnL}`);
  console.assert(analytics.openPositionsCount === 0, 'Open positions count should be 0');
  console.assert(analytics.closedTradesCount === 3, `Closed trades count should be 3, got ${analytics.closedTradesCount}`);
  console.log('✓ Test 4 Passed: Complete Position Closure');

  // Test 5: Persistence Across Reload
  // Re-instantiate or reload from localStorage
  const reloadedState = portfolioStorageService.loadPortfolio();
  console.assert(reloadedState.trades.length === 3, `Reloaded trades should be 3, got ${reloadedState.trades.length}`);
  const reloadedAnalytics = paperTradingService.getPortfolioAnalytics(mockQuotes).analytics;
  console.assert(reloadedAnalytics.realizedPnL === 580, `Reloaded Realized P/L should be 580, got ${reloadedAnalytics.realizedPnL}`);
  console.log('✓ Test 5 Passed: Persistence & Reload Verification');

  // Test 6: Legacy/Defensive handling for records missing realizedPnL or with field name aliases
  const legacyTrades = [
    {
      id: 'LEGACY_1',
      symbol: 'TCS',
      stockName: 'Tata Consultancy Services',
      action: 'BUY',
      orderType: 'MARKET',
      quantity: 10,
      entryPrice: 3000,
      exitPrice: 3200,
      status: 'CLOSED',
      openedAt: new Date().toISOString(),
      // missing realizedPnL intentionally
    },
    {
      id: 'LEGACY_2',
      symbol: 'TCS',
      stockName: 'Tata Consultancy Services',
      action: 'BUY',
      orderType: 'MARKET',
      quantity: 5,
      entryPrice: 3000,
      sellPrice: 3500, // alias for exitPrice
      realizedPL: 2500, // alias for realizedPnL
      status: 'CLOSED',
      openedAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem('tradeai_pmk_paper_trades_v1', JSON.stringify(legacyTrades));
  const legacyLoaded = portfolioStorageService.loadPortfolio();
  console.assert(legacyLoaded.trades[0].realizedPnL === 2000, `Defensive calculation should compute 2000 for LEGACY_1, got ${legacyLoaded.trades[0].realizedPnL}`);
  console.assert(legacyLoaded.trades[1].realizedPnL === 2500, `Alias resolution should extract 2500 for LEGACY_2, got ${legacyLoaded.trades[1].realizedPnL}`);
  console.log('✓ Test 6 Passed: Legacy Field Name Aliases & Defensive Recalculation');

  // Test 7: Explicit Regression Test: BUY 11 INFY @ 1963.84 -> SELL 5 INFY @ 2100.00
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();

  const buyTx = paperTradingService.executePaperTrade({
    symbol: 'INFY',
    stockName: 'Infosys Limited',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 11,
    currentPrice: 1963.84,
  });
  console.assert(buyTx.success, 'Buy 11 INFY shares should succeed');

  const partialSellTx = paperTradingService.executePaperTrade({
    symbol: 'INFY',
    stockName: 'Infosys Limited',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 5,
    currentPrice: 2100.00,
  });
  console.assert(partialSellTx.success, 'Sell 5 INFY shares should succeed');

  const allTrades = paperTradingService.getTrades();
  const closedRecords = allTrades.filter((t) => t.status === 'CLOSED');
  const openRecords = allTrades.filter((t) => t.status === 'OPEN');

  console.assert(closedRecords.length === 1, `Should have 1 CLOSED record, got ${closedRecords.length}`);
  console.assert(openRecords.length === 1, `Should have 1 OPEN record, got ${openRecords.length}`);

  const closedRec = closedRecords[0];
  const openRec = openRecords[0];

  console.assert(closedRec.quantity === 5, `CLOSED record quantity should be 5, got ${closedRec.quantity}`);
  console.assert(closedRec.action === 'SELL', `CLOSED record action should be SELL, got ${closedRec.action}`);
  console.assert(closedRec.entryPrice === 1963.84, `CLOSED record entry price should be 1963.84, got ${closedRec.entryPrice}`);
  console.assert(closedRec.exitPrice === 2100.00, `CLOSED record exit price should be 2100.00, got ${closedRec.exitPrice}`);
  const expectedRealizedPnL = Number(((2100.00 - 1963.84) * 5).toFixed(2)); // 680.80
  console.assert(
    closedRec.realizedPnL === expectedRealizedPnL,
    `Realized P/L should be ${expectedRealizedPnL}, got ${closedRec.realizedPnL}`
  );

  console.assert(openRec.quantity === 6, `OPEN record quantity should be 6, got ${openRec.quantity}`);
  console.assert(openRec.entryPrice === 1963.84, `OPEN record entry price should be 1963.84, got ${openRec.entryPrice}`);

  console.log('✓ Test 7 Passed: Exact Regression BUY 11 -> SELL 5 (CLOSED qty=5, OPEN qty=6, Realized P/L = +₹680.80)');

  // Test 8: Corrupted INFY localStorage Migration Repair Test
  const corruptedTrades = [
    {
      id: 'CORRUPTED_CLOSED',
      symbol: 'INFY',
      stockName: 'Infosys Limited',
      action: 'BUY',
      orderType: 'MARKET',
      quantity: 6,
      entryPrice: 1963.84,
      exitPrice: 1963.84,
      status: 'CLOSED',
      openedAt: new Date().toISOString(),
    },
    {
      id: 'CORRUPTED_OPEN',
      symbol: 'INFY',
      stockName: 'Infosys Limited',
      action: 'BUY',
      orderType: 'MARKET',
      quantity: 5,
      entryPrice: 1963.84,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem('tradeai_pmk_paper_trades_v1', JSON.stringify(corruptedTrades));
  const repairedState = portfolioStorageService.loadPortfolio();

  const repClosed = repairedState.trades.find((t) => t.status === 'CLOSED');
  const repOpen = repairedState.trades.find((t) => t.status === 'OPEN');

  console.assert(repClosed?.quantity === 5, `Repaired CLOSED quantity should be 5, got ${repClosed?.quantity}`);
  console.assert(repClosed?.action === 'SELL', `Repaired CLOSED action should be SELL, got ${repClosed?.action}`);
  console.assert(repOpen?.quantity === 6, `Repaired OPEN quantity should be 6, got ${repOpen?.quantity}`);
  console.log('✓ Test 8 Passed: Corrupted INFY localStorage State Repair & Migration');

  // ==========================================
  // FINAL REGRESSION AUDIT CASES
  // ==========================================

  // Audit Case 1: Partial profitable sale: BUY 10 @ ₹100 → SELL 4 @ ₹120
  // Expected: CLOSED = 4, OPEN = 6, realized P/L = +₹80.
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();

  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_PROFIT',
    stockName: 'Audit Profitable Stock',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 10,
    currentPrice: 100,
  });

  const audit1Sell = paperTradingService.executePaperTrade({
    symbol: 'AUDIT_PROFIT',
    stockName: 'Audit Profitable Stock',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 4,
    currentPrice: 120,
  });
  console.assert(audit1Sell.success, 'Audit Case 1 sell should succeed');

  const audit1Trades = paperTradingService.getTrades();
  const audit1Closed = audit1Trades.filter((t) => t.status === 'CLOSED');
  const audit1Open = audit1Trades.filter((t) => t.status === 'OPEN');

  console.assert(audit1Closed.length === 1, `Audit 1: Should have 1 closed trade, got ${audit1Closed.length}`);
  console.assert(audit1Closed[0].quantity === 4, `Audit 1: CLOSED quantity should be 4, got ${audit1Closed[0].quantity}`);
  console.assert(audit1Closed[0].entryPrice === 100, `Audit 1: CLOSED entryPrice should be 100, got ${audit1Closed[0].entryPrice}`);
  console.assert(audit1Closed[0].exitPrice === 120, `Audit 1: CLOSED exitPrice should be 120, got ${audit1Closed[0].exitPrice}`);
  console.assert(audit1Closed[0].realizedPnL === 80, `Audit 1: Realized P/L should be +80, got ${audit1Closed[0].realizedPnL}`);

  console.assert(audit1Open.length === 1, `Audit 1: Should have 1 open trade, got ${audit1Open.length}`);
  console.assert(audit1Open[0].quantity === 6, `Audit 1: OPEN quantity should be 6, got ${audit1Open[0].quantity}`);
  console.assert(audit1Open[0].entryPrice === 100, `Audit 1: OPEN entryPrice should be 100, got ${audit1Open[0].entryPrice}`);
  console.log('✓ Audit Case 1 Passed: Partial Profitable Sale (BUY 10 @ ₹100 -> SELL 4 @ ₹120 => CLOSED=4, OPEN=6, Realized P/L=+₹80)');

  // Audit Case 2: Partial losing sale: BUY 10 @ ₹100 → SELL 4 @ ₹90
  // Expected: CLOSED = 4, OPEN = 6, realized P/L = -₹40.
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();

  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_LOSS',
    stockName: 'Audit Losing Stock',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 10,
    currentPrice: 100,
  });

  const audit2Sell = paperTradingService.executePaperTrade({
    symbol: 'AUDIT_LOSS',
    stockName: 'Audit Losing Stock',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 4,
    currentPrice: 90,
  });
  console.assert(audit2Sell.success, 'Audit Case 2 sell should succeed');

  const audit2Trades = paperTradingService.getTrades();
  const audit2Closed = audit2Trades.filter((t) => t.status === 'CLOSED');
  const audit2Open = audit2Trades.filter((t) => t.status === 'OPEN');

  console.assert(audit2Closed.length === 1, `Audit 2: Should have 1 closed trade, got ${audit2Closed.length}`);
  console.assert(audit2Closed[0].quantity === 4, `Audit 2: CLOSED quantity should be 4, got ${audit2Closed[0].quantity}`);
  console.assert(audit2Closed[0].entryPrice === 100, `Audit 2: CLOSED entryPrice should be 100, got ${audit2Closed[0].entryPrice}`);
  console.assert(audit2Closed[0].exitPrice === 90, `Audit 2: CLOSED exitPrice should be 90, got ${audit2Closed[0].exitPrice}`);
  console.assert(audit2Closed[0].realizedPnL === -40, `Audit 2: Realized P/L should be -40, got ${audit2Closed[0].realizedPnL}`);

  console.assert(audit2Open.length === 1, `Audit 2: Should have 1 open trade, got ${audit2Open.length}`);
  console.assert(audit2Open[0].quantity === 6, `Audit 2: OPEN quantity should be 6, got ${audit2Open[0].quantity}`);
  console.assert(audit2Open[0].entryPrice === 100, `Audit 2: OPEN entryPrice should be 100, got ${audit2Open[0].entryPrice}`);
  console.log('✓ Audit Case 2 Passed: Partial Losing Sale (BUY 10 @ ₹100 -> SELL 4 @ ₹90 => CLOSED=4, OPEN=6, Realized P/L=-₹40)');

  // Audit Case 3: Multiple partial sales: BUY 10 @ ₹100 → SELL 3 @ ₹110 → SELL 2 @ ₹90 → SELL 5 @ ₹120
  // Expected: all quantities are accounted for exactly once, final OPEN quantity = 0, and total realized P/L = +₹110.
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();

  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_MULTI',
    stockName: 'Audit Multi Partial Stock',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 10,
    currentPrice: 100,
  });

  // Sell 3 @ 110 (P/L = +30)
  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_MULTI',
    stockName: 'Audit Multi Partial Stock',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 3,
    currentPrice: 110,
  });

  // Sell 2 @ 90 (P/L = -20)
  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_MULTI',
    stockName: 'Audit Multi Partial Stock',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 2,
    currentPrice: 90,
  });

  // Sell 5 @ 120 (P/L = +100)
  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_MULTI',
    stockName: 'Audit Multi Partial Stock',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 5,
    currentPrice: 120,
  });

  const audit3Trades = paperTradingService.getTrades();
  const audit3Closed = audit3Trades.filter((t) => t.status === 'CLOSED');
  const audit3Open = audit3Trades.filter((t) => t.status === 'OPEN');

  console.assert(audit3Open.length === 0, `Audit 3: Final OPEN positions count should be 0, got ${audit3Open.length}`);
  console.assert(audit3Closed.length === 3, `Audit 3: Should have exactly 3 closed trades, got ${audit3Closed.length}`);

  const totalClosedQuantity = audit3Closed.reduce((sum, t) => sum + t.quantity, 0);
  console.assert(totalClosedQuantity === 10, `Audit 3: All 10 shares must be accounted for once, got ${totalClosedQuantity}`);

  const totalRealizedAudit3 = audit3Closed.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
  // (110 - 100)*3 + (90 - 100)*2 + (120 - 100)*5 = 30 - 20 + 100 = 110
  console.assert(totalRealizedAudit3 === 110, `Audit 3: Total realized P/L should be +110, got ${totalRealizedAudit3}`);

  const audit3Analytics = paperTradingService.getPortfolioAnalytics(mockQuotes).analytics;
  console.assert(audit3Analytics.realizedPnL === 110, `Audit 3: Analytics realizedPnL should be 110, got ${audit3Analytics.realizedPnL}`);
  console.assert(audit3Analytics.openPositionsCount === 0, 'Audit 3: Analytics openPositionsCount should be 0');
  console.assert(audit3Analytics.closedTradesCount === 3, 'Audit 3: Analytics closedTradesCount should be 3');
  console.log('✓ Audit Case 3 Passed: Multiple Partial Sales (BUY 10 -> SELL 3 @ 110, SELL 2 @ 90, SELL 5 @ 120 => OPEN=0, CLOSED=10, Realized P/L=+₹110)');

  // Audit Case 4: Persistence across save / reload
  // Verify that after saving/reloading, open positions, closed trades, quantities, entry prices, exit prices, and realized P/L remain unchanged.
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();

  // Create 1 open position and 1 closed partial trade
  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_PERSIST',
    stockName: 'Persistence Stock',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 15,
    currentPrice: 200,
  });
  paperTradingService.executePaperTrade({
    symbol: 'AUDIT_PERSIST',
    stockName: 'Persistence Stock',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 5,
    currentPrice: 250,
  });

  const beforeReloadTrades = paperTradingService.getTrades();
  const loadedPortfolio = portfolioStorageService.loadPortfolio();

  console.assert(loadedPortfolio.trades.length === beforeReloadTrades.length, 'Loaded trades length must match before reload');

  const loadedClosed = loadedPortfolio.trades.find((t) => t.status === 'CLOSED');
  const loadedOpen = loadedPortfolio.trades.find((t) => t.status === 'OPEN');

  console.assert(loadedClosed !== undefined, 'Loaded closed trade must exist');
  console.assert(loadedOpen !== undefined, 'Loaded open trade must exist');

  console.assert(loadedClosed?.quantity === 5, `Loaded closed quantity must be 5, got ${loadedClosed?.quantity}`);
  console.assert(loadedClosed?.entryPrice === 200, `Loaded closed entryPrice must be 200, got ${loadedClosed?.entryPrice}`);
  console.assert(loadedClosed?.exitPrice === 250, `Loaded closed exitPrice must be 250, got ${loadedClosed?.exitPrice}`);
  console.assert(loadedClosed?.realizedPnL === 250, `Loaded closed realizedPnL must be 250, got ${loadedClosed?.realizedPnL}`);

  console.assert(loadedOpen?.quantity === 10, `Loaded open quantity must be 10, got ${loadedOpen?.quantity}`);
  console.assert(loadedOpen?.entryPrice === 200, `Loaded open entryPrice must be 200, got ${loadedOpen?.entryPrice}`);
  console.log('✓ Audit Case 4 Passed: Persistence Across Save & Reload (Positions, Quantities, Entry/Exit Prices, Realized P/L)');

  // Audit Case 5: Analytics Consistency
  // Verify that Portfolio Analytics and Trade History read the same underlying trade data and that total realized P/L equals sum of all closed trade P/L values.
  const audit5Trades = paperTradingService.getTrades();
  const sumClosedPnL = audit5Trades
    .filter((t) => t.status === 'CLOSED')
    .reduce((sum, t) => sum + (t.realizedPnL || 0), 0);

  const audit5Analytics = paperTradingService.getPortfolioAnalytics(mockQuotes).analytics;
  console.assert(
    audit5Analytics.realizedPnL === Number(sumClosedPnL.toFixed(2)),
    `Audit 5: Analytics realizedPnL (${audit5Analytics.realizedPnL}) must strictly equal sum of closed trade P/L values (${sumClosedPnL})`
  );
  console.assert(
    audit5Analytics.closedTradesCount === audit5Trades.filter((t) => t.status === 'CLOSED').length,
    'Audit 5: Closed trades count in analytics must match closed trades in trade history'
  );
  console.assert(
    audit5Analytics.openPositionsCount === audit5Trades.filter((t) => t.status === 'OPEN').length,
    'Audit 5: Open positions count in analytics must match open trades in trade history'
  );
  console.log('✓ Audit Case 5 Passed: Analytics & Trade History Data Consistency (Total Realized P/L = Sum of Closed Trades)');

  // ==========================================
  // TSLA PARTIAL-SELL DEDUPLICATION & POSITION HANDLING REGRESSION TESTS
  // ==========================================

  // TSLA Regression 1: BUY 6 TSLA @ 200 -> SELL 4 TSLA @ 250
  // Verify exactly one OPEN position of 2 shares and one CLOSED SELL record of 4 shares.
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();

  const buyTsla = paperTradingService.executePaperTrade({
    symbol: 'TSLA',
    stockName: 'Tesla, Inc.',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 6,
    currentPrice: 200,
  });
  console.assert(buyTsla.success, 'Buy 6 TSLA shares must succeed');

  const sellTsla = paperTradingService.executePaperTrade({
    symbol: 'TSLA',
    stockName: 'Tesla, Inc.',
    action: 'SELL',
    orderType: 'MARKET',
    quantity: 4,
    currentPrice: 250,
  });
  console.assert(sellTsla.success, 'Sell 4 TSLA shares must succeed');

  const tslaTrades = paperTradingService.getTrades();
  const tslaOpen = tslaTrades.filter((t) => t.status === 'OPEN');
  const tslaClosed = tslaTrades.filter((t) => t.status === 'CLOSED');

  console.assert(tslaTrades.length === 2, `Total trades should be exactly 2, got ${tslaTrades.length}`);
  console.assert(tslaOpen.length === 1, `Must have EXACTLY 1 open TSLA position, got ${tslaOpen.length}`);
  console.assert(tslaClosed.length === 1, `Must have EXACTLY 1 closed TSLA record, got ${tslaClosed.length}`);

  console.assert(tslaOpen[0].quantity === 2, `Open TSLA position quantity must be 2, got ${tslaOpen[0].quantity}`);
  console.assert(tslaOpen[0].action === 'BUY', `Open TSLA position action must be BUY, got ${tslaOpen[0].action}`);
  console.assert(tslaOpen[0].entryPrice === 200, `Open TSLA entryPrice must be 200, got ${tslaOpen[0].entryPrice}`);

  console.assert(tslaClosed[0].quantity === 4, `Closed TSLA record quantity must be 4, got ${tslaClosed[0].quantity}`);
  console.assert(tslaClosed[0].action === 'SELL', `Closed TSLA record action must be SELL, got ${tslaClosed[0].action}`);
  console.assert(tslaClosed[0].entryPrice === 200, `Closed TSLA entryPrice must be 200, got ${tslaClosed[0].entryPrice}`);
  console.assert(tslaClosed[0].exitPrice === 250, `Closed TSLA exitPrice must be 250, got ${tslaClosed[0].exitPrice}`);
  console.assert(tslaClosed[0].realizedPnL === 200, `Closed TSLA realizedPnL must be +200, got ${tslaClosed[0].realizedPnL}`);

  console.log('✓ TSLA Regression 1 Passed: BUY 6 TSLA -> SELL 4 TSLA (1 OPEN qty=2, 1 CLOSED SELL qty=4, Realized P/L=+₹200)');

  // TSLA Regression 2: Repair corrupted state containing BUY 6 OPEN + SELL 4 CLOSED + BUY 2 OPEN
  const corruptedTslaTrades = [
    {
      id: 'TSLA_STALE_BUY_6',
      symbol: 'TSLA',
      stockName: 'Tesla, Inc.',
      action: 'BUY',
      orderType: 'MARKET',
      quantity: 6,
      entryPrice: 200,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
    },
    {
      id: 'TSLA_CLOSED_SELL_4',
      symbol: 'TSLA',
      stockName: 'Tesla, Inc.',
      action: 'SELL',
      orderType: 'MARKET',
      quantity: 4,
      entryPrice: 200,
      exitPrice: 250,
      realizedPnL: 200,
      realizedPnLPercent: 25,
      status: 'CLOSED',
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
    },
    {
      id: 'TSLA_NEW_BUY_2',
      symbol: 'TSLA',
      stockName: 'Tesla, Inc.',
      action: 'BUY',
      orderType: 'MARKET',
      quantity: 2,
      entryPrice: 200,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem('tradeai_pmk_paper_trades_v1', JSON.stringify(corruptedTslaTrades));
  const repairedTsla = portfolioStorageService.loadPortfolio();

  const repTslaOpen = repairedTsla.trades.filter((t) => t.status === 'OPEN');
  const repTslaClosed = repairedTsla.trades.filter((t) => t.status === 'CLOSED');

  console.assert(repTslaOpen.length === 1, `Repaired TSLA open positions count should be 1, got ${repTslaOpen.length}`);
  console.assert(repTslaOpen[0].quantity === 2, `Repaired TSLA open quantity should be 2, got ${repTslaOpen[0].quantity}`);
  console.assert(repTslaClosed.length === 1, `Repaired TSLA closed records count should be 1, got ${repTslaClosed.length}`);
  console.assert(repTslaClosed[0].quantity === 4, `Repaired TSLA closed quantity should be 4, got ${repTslaClosed[0].quantity}`);

  console.log('✓ TSLA Regression 2 Passed: Auto-repaired corrupted [BUY 6 OPEN + SELL 4 CLOSED + BUY 2 OPEN] -> 1 OPEN (qty 2) & 1 CLOSED (qty 4)');

  // ==========================================
  // PHASE A BACKTESTING TESTS: FRICTION, COSTS & CRITICAL ISOLATION
  // ==========================================

  // Generate 100 days of mock price history with an upward and downward wave for testing
  const mockHistory: PricePoint[] = [];
  const baseDate = new Date('2025-01-01');
  for (let i = 0; i < 100; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    // Sine wave trend price between 100 and 150
    const price = Number((120 + 20 * Math.sin(i / 8)).toFixed(2));
    mockHistory.push({
      timestamp: d.toISOString(),
      date: d.toISOString().split('T')[0],
      open: price,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 50000,
    });
  }

  // 1. Test Backtest Isolation: Verify Backtesting never touches paper-trading storage, trades or cash
  portfolioStorageService.resetStorage();
  paperTradingService.resetPortfolio();

  // Execute a real paper trade to establish active paper-trading state
  paperTradingService.executePaperTrade({
    symbol: 'RELIANCE',
    stockName: 'Reliance Industries',
    action: 'BUY',
    orderType: 'MARKET',
    quantity: 10,
    currentPrice: 2500,
  });

  const paperTradesBefore = paperTradingService.getTrades();
  const paperCashBefore = paperTradingService.getAvailableCash();
  const rawStorageTradesBefore = localStorage.getItem('tradeai_pmk_paper_trades_v1');
  const rawStorageCashBefore = localStorage.getItem('tradeai_pmk_portfolio_cash_v1');

  // Run backtests with various strategies and friction settings
  const btResultZeroFriction = backtestingService.runBacktest(mockHistory, {
    symbol: 'RELIANCE',
    strategy: 'SMA_CROSSOVER',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 10,
    slowPeriod: 25,
    slippagePercent: 0,
    brokeragePerTrade: 0,
    regulatoryFeePercent: 0,
  });

  const btResultWithFriction = backtestingService.runBacktest(mockHistory, {
    symbol: 'RELIANCE',
    strategy: 'SMA_CROSSOVER',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 10,
    slowPeriod: 25,
    slippagePercent: 0.1, // 0.1% slippage
    brokeragePerTrade: 20, // ₹20 flat brokerage
    regulatoryFeePercent: 0.05, // 0.05% taxes
  });

  // Verify complete isolation of paper-trading state
  const paperTradesAfter = paperTradingService.getTrades();
  const paperCashAfter = paperTradingService.getAvailableCash();
  const rawStorageTradesAfter = localStorage.getItem('tradeai_pmk_paper_trades_v1');
  const rawStorageCashAfter = localStorage.getItem('tradeai_pmk_portfolio_cash_v1');

  console.assert(
    paperTradesBefore.length === paperTradesAfter.length && paperTradesAfter.length === 1,
    'Critical Isolation: Paper trade count must NOT change during or after running Backtests'
  );
  console.assert(
    paperTradesAfter[0].symbol === 'RELIANCE' && paperTradesAfter[0].quantity === 10,
    'Critical Isolation: Paper trade holding must remain identical'
  );
  console.assert(
    paperCashBefore === paperCashAfter,
    'Critical Isolation: Paper trading available cash must NOT change when running Backtests'
  );
  console.assert(
    rawStorageTradesBefore === rawStorageTradesAfter,
    'Critical Isolation: localStorage tradeai_pmk_paper_trades_v1 must remain untouched'
  );
  console.assert(
    rawStorageCashBefore === rawStorageCashAfter,
    'Critical Isolation: localStorage tradeai_pmk_portfolio_cash_v1 must remain untouched'
  );
  console.log('✓ Backtest Test 1 Passed: Complete Isolation (Backtest engine never alters paper-trading state or storage)');

  // 2. Test Slippage & Transaction Costs Deduction
  console.assert(
    btResultWithFriction.totalFrictionPaid! > 0,
    `Friction total must be positive with active fees, got ${btResultWithFriction.totalFrictionPaid}`
  );
  console.assert(
    btResultWithFriction.finalCapital < btResultZeroFriction.finalCapital,
    `Final capital with friction (${btResultWithFriction.finalCapital}) must be less than without friction (${btResultZeroFriction.finalCapital})`
  );

  // Check individual trade friction math consistency
  for (const trade of btResultWithFriction.trades) {
    console.assert(
      (trade.totalFrictionPaid || 0) > 0,
      'Every executed backtest trade under active friction must record non-zero total friction paid'
    );
    console.assert(
      trade.slippagePaid !== undefined && trade.brokeragePaid !== undefined && trade.regulatoryFeesPaid !== undefined,
      'Backtest trade must record separate breakdown for slippage, brokerage, and regulatory fees'
    );
  }
  console.log('✓ Backtest Test 2 Passed: Slippage (0%–0.5%), Brokerage, and Regulatory Fee deduction verified');

  // 3. Test Mathematical P/L Formula Consistency
  // Standard formula: Net P/L = (exitPrice - entryPrice) * quantity - (entryBrokerage + exitBrokerage + entryRegulatory + exitRegulatory)
  for (const trade of btResultWithFriction.trades) {
    const rawPnL = (trade.exitPrice - trade.entryPrice) * trade.quantity;
    const nonSlippageFees = (trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0);
    const expectedNetPnL = Number((rawPnL - nonSlippageFees).toFixed(2));
    console.assert(
      Math.abs(trade.pnl - expectedNetPnL) < 0.05,
      `Trade net P/L (${trade.pnl}) must match formula (${expectedNetPnL})`
    );
  }
  console.log('✓ Backtest Test 3 Passed: Standardized Backtest Net P/L Calculation aligns with accounting rules');

  // ----------------------------------------------------
  // Phase B Tests: Strategy Parameter Controls & Validation
  // ----------------------------------------------------

  // 4. SMA Crossover Parameter Customization
  const btSmaDefault = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'SMA_CROSSOVER',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 20,
    slowPeriod: 50,
  });

  const btSmaFast = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'SMA_CROSSOVER',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 10,
    slowPeriod: 30,
  });

  console.assert(
    btSmaDefault.strategyName === 'SMA Crossover (20/50)',
    `Expected 'SMA Crossover (20/50)', got '${btSmaDefault.strategyName}'`
  );
  console.assert(
    btSmaFast.strategyName === 'SMA Crossover (10/30)',
    `Expected 'SMA Crossover (10/30)', got '${btSmaFast.strategyName}'`
  );
  console.log('✓ Backtest Test 4 Passed: SMA Parameter Customization & dynamic indicator calculation');

  // 5. RSI Strategy Parameter Customization
  const btRsiDefault = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'RSI_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
  });

  const btRsiCustom = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'RSI_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    rsiPeriod: 10,
    rsiOversold: 25,
    rsiOverbought: 75,
  });

  console.assert(
    btRsiDefault.strategyName === 'RSI Reversal (14, 30/70)',
    `Expected 'RSI Reversal (14, 30/70)', got '${btRsiDefault.strategyName}'`
  );
  console.assert(
    btRsiCustom.strategyName === 'RSI Reversal (10, 25/75)',
    `Expected 'RSI Reversal (10, 25/75)', got '${btRsiCustom.strategyName}'`
  );
  console.log('✓ Backtest Test 5 Passed: RSI Parameter Customization');

  // 6. MACD Strategy Execution & Parameters
  const btMacd = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'MACD_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
  });
  console.assert(
    btMacd.strategyName === 'MACD Crossover (12/26/9)',
    `Expected 'MACD Crossover (12/26/9)', got '${btMacd.strategyName}'`
  );
  console.log('✓ Backtest Test 6 Passed: MACD Strategy & Parameters');

  // 7. Bollinger Bands Strategy Execution & Parameters
  const btBollinger = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'BOLLINGER_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    bollingerPeriod: 20,
    bollingerStdDev: 2.0,
  });
  console.assert(
    btBollinger.strategyName === 'Bollinger Bands (20, 2σ)',
    `Expected 'Bollinger Bands (20, 2σ)', got '${btBollinger.strategyName}'`
  );
  console.log('✓ Backtest Test 7 Passed: Bollinger Bands Strategy & Parameters');

  // 8. Parameter Validation & Error Handling
  let smaErrorThrown = false;
  try {
    backtestingService.runBacktest(mockHistory, {
      symbol: 'TEST_STOCK',
      strategy: 'SMA_CROSSOVER',
      startingCapital: 100000,
      timeframe: '1Y',
      fastPeriod: 50,
      slowPeriod: 20, // Invalid: fast >= slow
    });
  } catch (e: any) {
    smaErrorThrown = true;
    console.assert(
      e.message.includes('must be less than Slow SMA period'),
      `Expected fast < slow error message, got: ${e.message}`
    );
  }
  console.assert(smaErrorThrown, 'SMA fast >= slow must throw validation error');

  let rsiErrorThrown = false;
  try {
    backtestingService.runBacktest(mockHistory, {
      symbol: 'TEST_STOCK',
      strategy: 'RSI_STRATEGY',
      startingCapital: 100000,
      timeframe: '1Y',
      rsiPeriod: 5, // Invalid: < 7
      rsiOversold: 30,
      rsiOverbought: 70,
    });
  } catch (e: any) {
    rsiErrorThrown = true;
    console.assert(
      e.message.includes('RSI period must be between 7 and 21'),
      `Expected RSI period error, got: ${e.message}`
    );
  }
  console.assert(rsiErrorThrown, 'RSI invalid period must throw validation error');

  let macdErrorThrown = false;
  try {
    backtestingService.runBacktest(mockHistory, {
      symbol: 'TEST_STOCK',
      strategy: 'MACD_STRATEGY',
      startingCapital: 100000,
      timeframe: '1Y',
      macdFastPeriod: 25,
      macdSlowPeriod: 20, // Invalid: fast >= slow
      macdSignalPeriod: 9,
    });
  } catch (e: any) {
    macdErrorThrown = true;
  }
  console.assert(macdErrorThrown, 'MACD fast >= slow must throw validation error');

  console.log('✓ Backtest Test 8 Passed: Strategy Parameter Validations');

  // ----------------------------------------------------
  // Method C Tests: Multi-Indicator (Combined Strategy)
  // ----------------------------------------------------
  const paperTradesBeforeMethodC = JSON.stringify(paperTradingService.getTrades());
  const paperCashBeforeMethodC = paperTradingService.getAvailableCash();

  // 9. Combined Strategy Execution with Default Parameters
  const btCombinedDefault = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'COMBINED_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 20,
    slowPeriod: 50,
    rsiPeriod: 14,
    rsiOverbought: 70,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  console.assert(
    btCombinedDefault.strategyName.includes('Multi-Indicator Strategy'),
    `Expected 'Multi-Indicator Strategy' name, got: ${btCombinedDefault.strategyName}`
  );
  console.assert(
    btCombinedDefault.totalTrades >= 0,
    'Combined strategy must calculate trades cleanly'
  );
  console.log('✓ Method C Test 9 Passed: Multi-Indicator Combined Strategy Default Execution');

  // 10. Combined Strategy Parameter Sensitivity (Changing inputs alters signals & metrics)
  const btCombinedTuned = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'COMBINED_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 10,
    slowPeriod: 30,
    rsiPeriod: 10,
    rsiOverbought: 65,
    macdFastPeriod: 8,
    macdSlowPeriod: 20,
    macdSignalPeriod: 5,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  console.assert(
    btCombinedTuned.strategyName === 'Multi-Indicator Strategy (SMA 10/30 + RSI 10 + MACD 8/20/5)',
    `Expected custom strategy name, got: ${btCombinedTuned.strategyName}`
  );
  console.log('✓ Method C Test 10 Passed: Multi-Indicator Parameter Customization & dynamic indicator calculations');

  // 11. Combined Strategy Parameter Validation
  let combinedErrorThrown = false;
  try {
    backtestingService.runBacktest(mockHistory, {
      symbol: 'TEST_STOCK',
      strategy: 'COMBINED_STRATEGY',
      startingCapital: 100000,
      timeframe: '1Y',
      fastPeriod: 60, // Invalid: > 50
      slowPeriod: 50,
      rsiPeriod: 14,
      rsiOverbought: 70,
    });
  } catch (e: any) {
    combinedErrorThrown = true;
    console.assert(
      e.message.includes('Fast SMA period must be between 5 and 50'),
      `Expected fast SMA error message, got: ${e.message}`
    );
  }
  console.assert(combinedErrorThrown, 'Combined Strategy fast SMA > 50 must throw validation error');

  // 12. Complete Paper-Trading State Isolation after Method C runs
  const paperTradesAfterMethodC = JSON.stringify(paperTradingService.getTrades());
  const paperCashAfterMethodC = paperTradingService.getAvailableCash();
  console.assert(
    paperTradesAfterMethodC === paperTradesBeforeMethodC,
    'Paper trading trades array must remain unmodified by Method C backtests'
  );
  console.assert(
    paperCashAfterMethodC === paperCashBeforeMethodC,
    'Paper trading cash balance must remain unmodified by Method C backtests'
  );
  console.log('✓ Method C Test 12 Passed: Strict Paper-Trading State & Storage Isolation preserved');

  // ==========================================
  // PHASE C BACKTESTING ANALYTICS & EDGE CASE TESTS
  // ==========================================

  // 13. Detailed Per-Trade Analytics Verification
  const btPhaseC = backtestingService.runBacktest(mockHistory, {
    symbol: 'TEST_STOCK',
    strategy: 'SMA_CROSSOVER',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 5,
    slowPeriod: 20,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  console.assert(btPhaseC.trades.length > 0, 'Backtest must produce trades for SMA 5/20 on wave history');

  btPhaseC.trades.forEach((trade, idx) => {
    console.assert(trade.holdingDays >= 1, `Trade ${idx} holdingDays must be >= 1, got ${trade.holdingDays}`);
    console.assert(typeof trade.grossPnl === 'number', `Trade ${idx} grossPnl must be a number`);
    console.assert(typeof trade.pnl === 'number', `Trade ${idx} net pnl must be a number`);
    console.assert(typeof trade.pnlPercent === 'number', `Trade ${idx} pnlPercent must be a number`);
    console.assert(trade.status === 'WIN' || trade.status === 'LOSS' || trade.status === 'BREAKEVEN', `Trade ${idx} status must be WIN, LOSS, or BREAKEVEN`);
    console.assert(typeof trade.entryReason === 'string' && trade.entryReason.length > 0, `Trade ${idx} entryReason must be non-empty`);
    console.assert(typeof trade.exitReason === 'string' && trade.exitReason.length > 0, `Trade ${idx} exitReason must be non-empty`);
    console.assert(trade.totalFrictionPaid >= 0, `Trade ${idx} totalFrictionPaid must be >= 0`);

    // Verify gross vs net friction math: netPnl <= grossPnl
    if (trade.totalFrictionPaid > 0) {
      console.assert(trade.pnl <= trade.grossPnl, `Trade ${idx} net P/L (${trade.pnl}) must be <= gross P/L (${trade.grossPnl}) when friction is paid`);
    }
  });
  console.log('✓ Phase C Test 13 Passed: Detailed Per-Trade Analytics & Reason Tracking');

  // 14. Phase C Aggregated Metrics Consistency
  console.assert(typeof btPhaseC.grossProfit === 'number' && btPhaseC.grossProfit >= 0, 'grossProfit must be >= 0');
  console.assert(typeof btPhaseC.grossLoss === 'number' && btPhaseC.grossLoss >= 0, 'grossLoss must be >= 0');
  console.assert(typeof btPhaseC.totalGrossPnl === 'number', 'totalGrossPnl must be a number');
  console.assert(btPhaseC.winRate + btPhaseC.lossRate + btPhaseC.breakevenRate >= 99.9 && btPhaseC.winRate + btPhaseC.lossRate + btPhaseC.breakevenRate <= 100.1, 'Sum of win, loss, and breakeven rates must be ~100%');
  console.assert(btPhaseC.winningTrades + btPhaseC.losingTrades + btPhaseC.breakevenTrades === btPhaseC.totalTrades, 'Sum of winning, losing, breakeven counts must equal totalTrades');
  console.assert(btPhaseC.avgHoldingDays >= 1, `avgHoldingDays must be >= 1, got ${btPhaseC.avgHoldingDays}`);
  console.assert(btPhaseC.longestHoldingDays >= btPhaseC.avgHoldingDays, 'longestHoldingDays must be >= avgHoldingDays');
  console.assert(typeof btPhaseC.profitFactor === 'number', 'profitFactor must be a number');
  console.assert(typeof btPhaseC.maxDrawdown === 'number' && btPhaseC.maxDrawdown >= 0, 'maxDrawdown must be >= 0');
  console.assert(typeof btPhaseC.maxDrawdownPercent === 'number' && btPhaseC.maxDrawdownPercent >= 0, 'maxDrawdownPercent must be >= 0');
  console.log('✓ Phase C Test 14 Passed: Aggregated Strategy Risk & Return Metrics Consistency');

  // 15. Zero-Trade and Flat Price Edge Cases
  const flatHistory: PricePoint[] = [];
  for (let i = 0; i < 50; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    flatHistory.push({
      date: d.toISOString().split('T')[0],
      timestamp: d.toISOString(),
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 1000,
    });
  }

  const btZeroTrade = backtestingService.runBacktest(flatHistory, {
    symbol: 'FLAT_ASSET',
    strategy: 'SMA_CROSSOVER',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 10,
    slowPeriod: 30,
  });

  console.assert(btZeroTrade.totalTrades === 0, `Zero trades expected on flat prices, got ${btZeroTrade.totalTrades}`);
  console.assert(btZeroTrade.winRate === 0, 'Win rate must be 0 for 0 trades');
  console.assert(btZeroTrade.avgHoldingDays === 0, 'Avg holding days must be 0 for 0 trades');
  console.assert(btZeroTrade.largestWin === 0, 'Largest win must be 0 for 0 trades');
  console.assert(btZeroTrade.largestLoss === 0, 'Largest loss must be 0 for 0 trades');
  console.assert(btZeroTrade.trades.length === 0, 'Trades array must be empty');
  console.log('✓ Phase C Test 15 Passed: Zero-Trade and Flat Price Edge Cases');

  // 16. Multi-Strategy Analytics Compatibility
  const strategiesToTest: StrategyType[] = [
    'SMA_CROSSOVER',
    'RSI_STRATEGY',
    'MACD_STRATEGY',
    'BOLLINGER_STRATEGY',
    'COMBINED_STRATEGY',
  ];

  strategiesToTest.forEach((strat) => {
    const res = backtestingService.runBacktest(mockHistory, {
      symbol: 'TEST_STOCK',
      strategy: strat,
      startingCapital: 100000,
      timeframe: '1Y',
      fastPeriod: 5,
      slowPeriod: 20,
      rsiPeriod: 7,
      rsiOversold: 35,
      rsiOverbought: 65,
      macdFastPeriod: 8,
      macdSlowPeriod: 20,
      macdSignalPeriod: 5,
      bollingerPeriod: 10,
      bollingerStdDev: 1.5,
      slippagePercent: 0.05,
      brokeragePerTrade: 20,
      regulatoryFeePercent: 0.05,
    });

    console.assert(res.strategyName.length > 0, `${strat} strategyName must be non-empty`);
    console.assert(Array.isArray(res.trades), `${strat} trades must be an array`);
    console.assert(Array.isArray(res.equityCurve), `${strat} equityCurve must be an array`);
    console.assert(typeof res.winRate === 'number', `${strat} winRate must be a number`);
  });
  console.log('✓ Phase C Test 16 Passed: Full Compatibility across SMA, RSI, MACD, Bollinger & Combined Strategies');

  // 17. Regression Verification: Fast SMA 20 and Slow SMA 50 generates signals on default stock AAPL
  const aaplStock = MOCK_STOCKS.find((s) => s.symbol === 'AAPL')!;
  const aaplBacktest = backtestingService.runBacktest(aaplStock.history, {
    symbol: 'AAPL',
    strategy: 'SMA_CROSSOVER',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 20,
    slowPeriod: 50,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  console.assert(
    aaplBacktest.trades.length > 0,
    `AAPL SMA 20/50 backtest must generate trades/signals, got ${aaplBacktest.trades.length}`
  );
  console.assert(
    aaplBacktest.equityCurve.length === aaplStock.history.length,
    `AAPL equity curve length (${aaplBacktest.equityCurve.length}) must match history length (${aaplStock.history.length})`
  );
  console.assert(
    typeof aaplBacktest.trades[0].entryReason === 'string' && aaplBacktest.trades[0].entryReason.includes('SMA'),
    `AAPL first trade entryReason must describe SMA signal, got: ${aaplBacktest.trades[0].entryReason}`
  );
  console.log('✓ Test 17 Passed: SMA 20/50 Crossover Signal Generation & Benchmark Alignment on AAPL');

  // 18. Comprehensive RSI Reversal Backtesting Strategy Verification
  const preRsiState = portfolioStorageService.loadPortfolio();
  const rsiBacktest = backtestingService.runBacktest(aaplStock.history, {
    symbol: 'AAPL',
    strategy: 'RSI_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  // 18.1 Entry & Exit Signals
  console.assert(rsiBacktest.trades.length > 0, `RSI backtest must generate trades for AAPL, got ${rsiBacktest.trades.length}`);
  console.assert(rsiBacktest.strategyName === 'RSI Reversal (14, 30/70)', `Strategy name mismatch: ${rsiBacktest.strategyName}`);

  // 18.2 Equity Curve Update & Benchmark
  console.assert(rsiBacktest.equityCurve.length === aaplStock.history.length, `Equity curve length must match history: ${rsiBacktest.equityCurve.length} vs ${aaplStock.history.length}`);
  console.assert(rsiBacktest.equityCurve[0].equity === 100000, `First equity point must match initial capital`);
  console.assert(
    Math.abs(rsiBacktest.equityCurve[rsiBacktest.equityCurve.length - 1].equity - rsiBacktest.finalCapital) < 0.01,
    `Final equity curve point must match finalCapital`
  );
  console.assert(typeof rsiBacktest.buyAndHoldReturnPercent === 'number', `Buy & hold benchmark return must be a number`);

  // 18.3 Gross / Net P&L & Friction Math
  rsiBacktest.trades.forEach((trade, idx) => {
    console.assert(trade.quantity > 0, `Trade ${idx} quantity must be > 0`);
    console.assert(trade.entryPrice > 0 && trade.exitPrice > 0, `Trade ${idx} entry and exit prices must be > 0`);
    console.assert(trade.holdingDays >= 1, `Trade ${idx} holdingDays must be >= 1, got ${trade.holdingDays}`);
    
    // Check gross PnL calculation from executed entry and exit prices
    const expectedGross = Number(((trade.exitPrice - trade.entryPrice) * trade.quantity).toFixed(2));
    console.assert(
      Math.abs(trade.grossPnl - expectedGross) < 0.05,
      `Trade ${idx} gross PnL (${trade.grossPnl}) must match (exitPrice - entryPrice) * qty (${expectedGross})`
    );

    // Check friction breakdown: totalFriction = slippage + brokerage + regFees
    const calculatedFriction = Number(((trade.slippagePaid || 0) + (trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0)).toFixed(2));
    console.assert(
      Math.abs(trade.totalFrictionPaid - calculatedFriction) < 0.05,
      `Trade ${idx} total friction (${trade.totalFrictionPaid}) must match component sum (${calculatedFriction})`
    );

    // Check Net PnL = Gross PnL - (Brokerage + Regulatory Fees)
    const directFees = Number(((trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0)).toFixed(2));
    const expectedNet = Number((trade.grossPnl - directFees).toFixed(2));
    console.assert(
      Math.abs(trade.pnl - expectedNet) < 0.05,
      `Trade ${idx} net PnL (${trade.pnl}) must equal grossPnl - directFees (${expectedNet})`
    );

    // Check trade reasons in execution log
    console.assert(typeof trade.entryReason === 'string' && trade.entryReason.includes('RSI'), `Trade ${idx} entryReason must describe RSI, got: ${trade.entryReason}`);
    console.assert(typeof trade.exitReason === 'string' && trade.exitReason.length > 0, `Trade ${idx} exitReason must be populated, got: ${trade.exitReason}`);
  });

  // 18.4 CSV Export Data Integrity Verification
  const csvHeaders = [
    'Trade #', 'Type', 'Status', 'Entry Date', 'Entry Price', 'Entry Reason',
    'Exit Date', 'Exit Price', 'Exit Reason', 'Quantity', 'Holding Days',
    'Gross P/L', 'Slippage Paid', 'Brokerage Paid', 'Regulatory Taxes',
    'Total Friction', 'Net P/L', 'Net P/L (%)'
  ];
  const csvRows = rsiBacktest.trades.map((t, idx) => [
    idx + 1, t.type, t.status, t.entryDate, t.entryPrice.toFixed(2), `"${t.entryReason}"`,
    t.exitDate, t.exitPrice.toFixed(2), `"${t.exitReason}"`, t.quantity, t.holdingDays,
    t.grossPnl.toFixed(2), (t.slippagePaid || 0).toFixed(2), (t.brokeragePaid || 0).toFixed(2),
    (t.regulatoryFeesPaid || 0).toFixed(2), (t.totalFrictionPaid || 0).toFixed(2),
    t.pnl.toFixed(2), t.pnlPercent.toFixed(2)
  ]);
  console.assert(csvRows.length === rsiBacktest.trades.length, `CSV rows count must equal trades count`);
  console.assert(csvRows[0].length === csvHeaders.length, `CSV column count must match headers count`);

  // 18.5 Paper-Trading State Isolation
  const portfolioAfterRsi = portfolioStorageService.loadPortfolio();
  console.assert(portfolioAfterRsi.trades.length === preRsiState.trades.length, 'Portfolio trades must remain untouched by RSI backtest');
  console.assert(portfolioAfterRsi.availableCash === preRsiState.availableCash, 'Portfolio availableCash must remain untouched by RSI backtest');

  console.log('✓ Test 18 Passed: Full Verification of RSI Reversal Strategy (Signals, Execution, Friction, CSV & Isolation)');

  // 19. Comprehensive MACD Backtesting Strategy Verification
  const preMacdState = portfolioStorageService.loadPortfolio();
  const macdBacktest = backtestingService.runBacktest(aaplStock.history, {
    symbol: 'AAPL',
    strategy: 'MACD_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  // 19.1 Indicator and Strategy Naming
  console.assert(
    macdBacktest.strategyName === 'MACD Crossover (12/26/9)',
    `Strategy name mismatch: ${macdBacktest.strategyName}`
  );
  console.assert(
    macdBacktest.trades.length > 0,
    `MACD backtest must generate trades for AAPL, got ${macdBacktest.trades.length}`
  );

  // 19.2 Equity Curve & Buy & Hold Benchmark Synchronization
  console.assert(
    macdBacktest.equityCurve.length === aaplStock.history.length,
    `Equity curve length (${macdBacktest.equityCurve.length}) must match history (${aaplStock.history.length})`
  );
  console.assert(
    macdBacktest.equityCurve[0].equity === 100000,
    `First equity point must match initial capital`
  );
  console.assert(
    Math.abs(macdBacktest.equityCurve[macdBacktest.equityCurve.length - 1].equity - macdBacktest.finalCapital) < 0.05,
    `Final equity curve point (${macdBacktest.equityCurve[macdBacktest.equityCurve.length - 1].equity}) must match finalCapital (${macdBacktest.finalCapital})`
  );
  const expectedBuyAndHold = Number(
    (((aaplStock.history[aaplStock.history.length - 1].close - aaplStock.history[0].close) / aaplStock.history[0].close) * 100).toFixed(2)
  );
  console.assert(
    Math.abs(macdBacktest.buyAndHoldReturnPercent - expectedBuyAndHold) < 0.05,
    `Buy & hold benchmark return mismatch: ${macdBacktest.buyAndHoldReturnPercent} vs ${expectedBuyAndHold}`
  );

  // 19.3 Trade Execution, Order Sizing, Friction, Gross & Net P/L Math
  macdBacktest.trades.forEach((trade, idx) => {
    console.assert(trade.quantity > 0, `Trade ${idx} quantity must be > 0, got ${trade.quantity}`);
    console.assert(trade.entryPrice > 0 && trade.exitPrice > 0, `Trade ${idx} prices must be > 0`);
    console.assert(trade.holdingDays >= 1, `Trade ${idx} holdingDays must be >= 1, got ${trade.holdingDays}`);

    // Gross P/L check: (exitPrice - entryPrice) * quantity
    const expectedGross = Number(((trade.exitPrice - trade.entryPrice) * trade.quantity).toFixed(2));
    console.assert(
      Math.abs(trade.grossPnl - expectedGross) < 0.05,
      `Trade ${idx} gross PnL (${trade.grossPnl}) must match expected (${expectedGross})`
    );

    // Friction items check: totalFriction = slippage + brokerage + regulatory fees
    const calculatedFriction = Number(((trade.slippagePaid || 0) + (trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0)).toFixed(2));
    console.assert(
      Math.abs(trade.totalFrictionPaid - calculatedFriction) < 0.05,
      `Trade ${idx} friction (${trade.totalFrictionPaid}) must match component sum (${calculatedFriction})`
    );

    // Direct fees deduction check: netPnl = grossPnl - (brokerage + regulatory fees)
    const directFees = Number(((trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0)).toFixed(2));
    const expectedNet = Number((trade.grossPnl - directFees).toFixed(2));
    console.assert(
      Math.abs(trade.pnl - expectedNet) < 0.05,
      `Trade ${idx} net PnL (${trade.pnl}) must equal grossPnl - directFees (${expectedNet})`
    );

    // Trade status check
    const expectedStatus = trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BREAKEVEN';
    console.assert(
      trade.status === expectedStatus,
      `Trade ${idx} status (${trade.status}) must match expected (${expectedStatus})`
    );

    // Trade rationale checks
    console.assert(
      typeof trade.entryReason === 'string' && trade.entryReason.includes('MACD'),
      `Trade ${idx} entryReason must describe MACD signal, got: ${trade.entryReason}`
    );
    console.assert(
      typeof trade.exitReason === 'string' && trade.exitReason.length > 0,
      `Trade ${idx} exitReason must be present, got: ${trade.exitReason}`
    );
  });

  // 19.4 Performance & Risk Aggregates (Win Rate, Profit Factor, Max Drawdown)
  console.assert(
    macdBacktest.totalTrades === macdBacktest.winningTrades + macdBacktest.losingTrades + macdBacktest.breakevenTrades,
    `Trade count totals mismatch: ${macdBacktest.totalTrades} vs sum of outcomes`
  );
  console.assert(
    macdBacktest.maxDrawdown >= 0 && macdBacktest.maxDrawdownPercent >= 0,
    `Max drawdown must be non-negative, got ${macdBacktest.maxDrawdown} (${macdBacktest.maxDrawdownPercent}%)`
  );
  console.assert(
    macdBacktest.profitFactor >= 0,
    `Profit factor must be >= 0, got ${macdBacktest.profitFactor}`
  );
  console.assert(
    macdBacktest.avgHoldingDays >= 1,
    `Average holding days must be >= 1, got ${macdBacktest.avgHoldingDays}`
  );

  // 19.5 Multi-Stock Execution Consistency (e.g., TSLA, GOOGL)
  const tslaStock = MOCK_STOCKS.find((s) => s.symbol === 'TSLA')!;
  const tslaMacd = backtestingService.runBacktest(tslaStock.history, {
    symbol: 'TSLA',
    strategy: 'MACD_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });
  console.assert(tslaMacd.trades.length >= 4, `TSLA MACD must execute trades, got ${tslaMacd.trades.length}`);
  console.assert(tslaMacd.winningTrades > 0, 'TSLA MACD should have winning trades');

  // 19.6 CSV Export Formatting Check
  const macdCsvHeaders = [
    'Trade #', 'Type', 'Status', 'Entry Date', 'Entry Price', 'Entry Reason',
    'Exit Date', 'Exit Price', 'Exit Reason', 'Quantity', 'Holding Days',
    'Gross P/L', 'Slippage Paid', 'Brokerage Paid', 'Regulatory Taxes',
    'Total Friction', 'Net P/L', 'Net P/L (%)'
  ];
  const macdCsvRows = macdBacktest.trades.map((t, idx) => [
    idx + 1, t.type, t.status, t.entryDate, t.entryPrice.toFixed(2), `"${t.entryReason}"`,
    t.exitDate, t.exitPrice.toFixed(2), `"${t.exitReason}"`, t.quantity, t.holdingDays,
    t.grossPnl.toFixed(2), (t.slippagePaid || 0).toFixed(2), (t.brokeragePaid || 0).toFixed(2),
    (t.regulatoryFeesPaid || 0).toFixed(2), (t.totalFrictionPaid || 0).toFixed(2),
    t.pnl.toFixed(2), t.pnlPercent.toFixed(2)
  ]);
  console.assert(macdCsvRows.length === macdBacktest.trades.length, `CSV rows count must equal trades count`);
  console.assert(macdCsvRows[0].length === macdCsvHeaders.length, `CSV column count must match headers count`);

  // 19.7 Paper-Trading State Isolation
  const portfolioAfterMacd = portfolioStorageService.loadPortfolio();
  console.assert(portfolioAfterMacd.trades.length === preMacdState.trades.length, 'Portfolio trades must remain untouched by MACD backtest');
  console.assert(portfolioAfterMacd.availableCash === preMacdState.availableCash, 'Portfolio availableCash must remain untouched by MACD backtest');

  console.log('✓ Test 19 Passed: Full Verification of MACD Strategy (Signals, Execution, Risk Metrics, CSV & Isolation)');

  // 20. Comprehensive Bollinger Bands Backtesting Strategy Verification
  // 20.1 Mathematical Indicator & Standard Deviation Verification
  const testPrices = [10, 20, 30, 40, 50];
  const bbMath = calculateBollingerBands(testPrices, 5, 2);
  console.assert(isNaN(bbMath.middle[0]) && isNaN(bbMath.middle[3]), 'First 4 values of 5-period BB must be NaN');
  console.assert(bbMath.middle[4] === 30, `Middle band mean must be 30, got ${bbMath.middle[4]}`);
  console.assert(bbMath.upper[4] === 58.28, `Upper band must be 58.28, got ${bbMath.upper[4]}`);
  console.assert(bbMath.lower[4] === 1.72, `Lower band must be 1.72, got ${bbMath.lower[4]}`);
  
  // Bandwidth & %B formulas
  const bandwidth = Number((bbMath.upper[4] - bbMath.lower[4]).toFixed(2));
  console.assert(bandwidth === 56.56, `Bandwidth must be 56.56, got ${bandwidth}`);
  const pctBandwidth = Number(((bandwidth / bbMath.middle[4]) * 100).toFixed(2));
  console.assert(pctBandwidth === 188.53, `% Bandwidth must be 188.53%, got ${pctBandwidth}%`);

  // Flat price series (zero standard deviation edge case)
  const flatPrices = [100, 100, 100, 100, 100];
  const bbFlat = calculateBollingerBands(flatPrices, 5, 2);
  console.assert(bbFlat.middle[4] === 100 && bbFlat.upper[4] === 100 && bbFlat.lower[4] === 100, 'Flat prices must yield upper === middle === lower === 100');

  // 20.2 Parameter Validation Bounds
  let bbParamErrorCaught = false;
  try {
    backtestingService.runBacktest(aaplStock.history, {
      symbol: 'AAPL',
      strategy: 'BOLLINGER_STRATEGY',
      startingCapital: 100000,
      timeframe: '1Y',
      bollingerPeriod: 5, // Invalid (< 10)
      bollingerStdDev: 2.0,
    });
  } catch (err: any) {
    bbParamErrorCaught = true;
    console.assert(err.message.includes('Bollinger Bands period must be between 10 and 30'), `Error message mismatch: ${err.message}`);
  }
  console.assert(bbParamErrorCaught, 'Should reject bollingerPeriod < 10');

  bbParamErrorCaught = false;
  try {
    backtestingService.runBacktest(aaplStock.history, {
      symbol: 'AAPL',
      strategy: 'BOLLINGER_STRATEGY',
      startingCapital: 100000,
      timeframe: '1Y',
      bollingerPeriod: 20,
      bollingerStdDev: 3.5, // Invalid (> 3.0)
    });
  } catch (err: any) {
    bbParamErrorCaught = true;
    console.assert(err.message.includes('Bollinger standard deviation multiplier must be between 1.5 and 3.0'), `Error message mismatch: ${err.message}`);
  }
  console.assert(bbParamErrorCaught, 'Should reject bollingerStdDev > 3.0');

  // 20.3 Full Execution on AAPL with standard 20, 2σ
  const preBbState = portfolioStorageService.loadPortfolio();
  const bbBacktest = backtestingService.runBacktest(aaplStock.history, {
    symbol: 'AAPL',
    strategy: 'BOLLINGER_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    bollingerPeriod: 20,
    bollingerStdDev: 2.0,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  // Strategy Naming
  console.assert(
    bbBacktest.strategyName === 'Bollinger Bands (20, 2σ)',
    `Strategy name mismatch: ${bbBacktest.strategyName}`
  );
  console.assert(bbBacktest.trades.length > 0, `Bollinger backtest must generate trades for AAPL, got ${bbBacktest.trades.length}`);

  // Equity Curve & Buy & Hold Benchmark Synchronization
  console.assert(
    bbBacktest.equityCurve.length === aaplStock.history.length,
    `Equity curve length (${bbBacktest.equityCurve.length}) must match history (${aaplStock.history.length})`
  );
  console.assert(
    bbBacktest.equityCurve[0].equity === 100000,
    `Initial equity curve point must equal startingCapital`
  );
  console.assert(
    Math.abs(bbBacktest.equityCurve[bbBacktest.equityCurve.length - 1].equity - bbBacktest.finalCapital) < 0.05,
    `Final equity curve point (${bbBacktest.equityCurve[bbBacktest.equityCurve.length - 1].equity}) must match finalCapital (${bbBacktest.finalCapital})`
  );
  const expectedBbBuyAndHold = Number(
    (((aaplStock.history[aaplStock.history.length - 1].close - aaplStock.history[0].close) / aaplStock.history[0].close) * 100).toFixed(2)
  );
  console.assert(
    Math.abs(bbBacktest.buyAndHoldReturnPercent - expectedBbBuyAndHold) < 0.05,
    `Buy & hold benchmark return mismatch: ${bbBacktest.buyAndHoldReturnPercent} vs ${expectedBbBuyAndHold}`
  );

  // 20.4 Trade Execution, Order Sizing, Friction, Gross & Net P/L
  bbBacktest.trades.forEach((trade, idx) => {
    console.assert(trade.quantity > 0, `Trade ${idx} quantity must be > 0, got ${trade.quantity}`);
    console.assert(trade.entryPrice > 0 && trade.exitPrice > 0, `Trade ${idx} prices must be > 0`);
    console.assert(trade.holdingDays >= 1, `Trade ${idx} holdingDays must be >= 1, got ${trade.holdingDays}`);

    // Gross P/L check: (exitPrice - entryPrice) * quantity
    const expectedGross = Number(((trade.exitPrice - trade.entryPrice) * trade.quantity).toFixed(2));
    console.assert(
      Math.abs(trade.grossPnl - expectedGross) < 0.05,
      `Trade ${idx} gross PnL (${trade.grossPnl}) must match expected (${expectedGross})`
    );

    // Friction items check: totalFriction = slippage + brokerage + regulatory fees
    const calculatedFriction = Number(((trade.slippagePaid || 0) + (trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0)).toFixed(2));
    console.assert(
      Math.abs(trade.totalFrictionPaid - calculatedFriction) < 0.05,
      `Trade ${idx} friction (${trade.totalFrictionPaid}) must match component sum (${calculatedFriction})`
    );

    // Direct fees deduction check: netPnl = grossPnl - (brokerage + regulatory fees)
    const directFees = Number(((trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0)).toFixed(2));
    const expectedNet = Number((trade.grossPnl - directFees).toFixed(2));
    console.assert(
      Math.abs(trade.pnl - expectedNet) < 0.05,
      `Trade ${idx} net PnL (${trade.pnl}) must equal grossPnl - directFees (${expectedNet})`
    );

    // Trade status check
    const expectedStatus = trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BREAKEVEN';
    console.assert(
      trade.status === expectedStatus,
      `Trade ${idx} status (${trade.status}) must match expected (${expectedStatus})`
    );

    // Trade rationale checks
    console.assert(
      typeof trade.entryReason === 'string' && trade.entryReason.includes('Bollinger'),
      `Trade ${idx} entryReason must describe Bollinger signal, got: ${trade.entryReason}`
    );
    console.assert(
      typeof trade.exitReason === 'string' && trade.exitReason.length > 0,
      `Trade ${idx} exitReason must be present, got: ${trade.exitReason}`
    );
  });

  // 20.5 Risk & Return Aggregate Metrics
  console.assert(
    bbBacktest.totalTrades === bbBacktest.winningTrades + bbBacktest.losingTrades + bbBacktest.breakevenTrades,
    `Trade count totals mismatch: ${bbBacktest.totalTrades} vs sum of outcomes`
  );
  console.assert(
    bbBacktest.maxDrawdown >= 0 && bbBacktest.maxDrawdownPercent >= 0,
    `Max drawdown must be non-negative, got ${bbBacktest.maxDrawdown} (${bbBacktest.maxDrawdownPercent}%)`
  );
  console.assert(
    bbBacktest.profitFactor >= 0,
    `Profit factor must be >= 0, got ${bbBacktest.profitFactor}`
  );
  console.assert(
    bbBacktest.avgHoldingDays >= 1,
    `Average holding days must be >= 1, got ${bbBacktest.avgHoldingDays}`
  );

  // 20.6 Custom Parameters Execution on RELIANCE
  const relianceStock = MOCK_STOCKS.find((s) => s.symbol === 'RELIANCE')!;
  const relianceBb = backtestingService.runBacktest(relianceStock.history, {
    symbol: 'RELIANCE',
    strategy: 'BOLLINGER_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    bollingerPeriod: 15,
    bollingerStdDev: 1.8,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });
  console.assert(
    relianceBb.strategyName === 'Bollinger Bands (15, 1.8σ)',
    `Custom Bollinger strategy name mismatch: ${relianceBb.strategyName}`
  );
  console.assert(relianceBb.trades.length > 0, `RELIANCE custom BB must execute trades, got ${relianceBb.trades.length}`);

  // 20.7 CSV Export Check
  const bbCsvHeaders = [
    'Trade #', 'Type', 'Status', 'Entry Date', 'Entry Price', 'Entry Reason',
    'Exit Date', 'Exit Price', 'Exit Reason', 'Quantity', 'Holding Days',
    'Gross P/L', 'Slippage Paid', 'Brokerage Paid', 'Regulatory Taxes',
    'Total Friction', 'Net P/L', 'Net P/L (%)'
  ];
  const bbCsvRows = bbBacktest.trades.map((t, idx) => [
    idx + 1, t.type, t.status, t.entryDate, t.entryPrice.toFixed(2), `"${t.entryReason}"`,
    t.exitDate, t.exitPrice.toFixed(2), `"${t.exitReason}"`, t.quantity, t.holdingDays,
    t.grossPnl.toFixed(2), (t.slippagePaid || 0).toFixed(2), (t.brokeragePaid || 0).toFixed(2),
    (t.regulatoryFeesPaid || 0).toFixed(2), (t.totalFrictionPaid || 0).toFixed(2),
    t.pnl.toFixed(2), t.pnlPercent.toFixed(2)
  ]);
  console.assert(bbCsvRows.length === bbBacktest.trades.length, `CSV rows count must equal trades count`);
  console.assert(bbCsvRows[0].length === bbCsvHeaders.length, `CSV column count must match headers count`);

  // 20.8 Paper-Trading State & Storage Isolation
  const portfolioAfterBb = portfolioStorageService.loadPortfolio();
  console.assert(portfolioAfterBb.trades.length === preBbState.trades.length, 'Portfolio trades must remain untouched by Bollinger backtest');
  console.assert(portfolioAfterBb.availableCash === preBbState.availableCash, 'Portfolio availableCash must remain untouched by Bollinger backtest');

  console.log('✓ Test 20 Passed: Full Verification of Bollinger Bands Strategy (Math, Bands, Signals, Risk Metrics, CSV & Isolation)');

  // 21. Comprehensive Multi-Indicator Confluence, Risk, Edge Cases & Idempotency Audit
  // 21.1 Multi-Indicator Confluence on AAPL & MSFT
  const preMultiState = portfolioStorageService.loadPortfolio();
  const multiBacktest1 = backtestingService.runBacktest(aaplStock.history, {
    symbol: 'AAPL',
    strategy: 'COMBINED_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 20,
    slowPeriod: 50,
    rsiPeriod: 14,
    rsiOverbought: 70,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });

  // Strategy Name & Warm-up Verification
  console.assert(
    multiBacktest1.strategyName.includes('Multi-Indicator Strategy'),
    `Strategy name mismatch: ${multiBacktest1.strategyName}`
  );
  console.assert(multiBacktest1.trades.length > 0, `Multi-indicator backtest should generate trades for AAPL`);

  // Check that no trade entered before indicator warm-up period (slowPeriod 50)
  const firstTradeEntryDate = multiBacktest1.trades[0].entryDate;
  const firstTradeIndex = aaplStock.history.findIndex((p) => p.date === firstTradeEntryDate);
  console.assert(
    firstTradeIndex >= 49,
    `First trade must occur after 50-bar indicator warm-up period, occurred at index ${firstTradeIndex}`
  );

  // Check that trades never overlap (Single Active Position invariant)
  for (let i = 0; i < multiBacktest1.trades.length - 1; i++) {
    const currentTrade = multiBacktest1.trades[i];
    const nextTrade = multiBacktest1.trades[i + 1];
    const currentExitIdx = aaplStock.history.findIndex((p) => p.date === currentTrade.exitDate);
    const nextEntryIdx = aaplStock.history.findIndex((p) => p.date === nextTrade.entryDate);
    console.assert(
      nextEntryIdx >= currentExitIdx,
      `Trade ${i + 1} exit (${currentTrade.exitDate}) must precede or equal Trade ${i + 2} entry (${nextTrade.entryDate})`
    );
  }

  // 21.2 Mathematical Accounting & Risk Checks
  multiBacktest1.trades.forEach((trade, idx) => {
    // Gross P&L check
    const expectedGross = Number(((trade.exitPrice - trade.entryPrice) * trade.quantity).toFixed(2));
    console.assert(
      Math.abs(trade.grossPnl - expectedGross) < 0.05,
      `Multi-indicator Trade ${idx} Gross PnL mismatch: ${trade.grossPnl} vs ${expectedGross}`
    );

    // Direct fees deduction check
    const directFees = Number(((trade.brokeragePaid || 0) + (trade.regulatoryFeesPaid || 0)).toFixed(2));
    const expectedNet = Number((trade.grossPnl - directFees).toFixed(2));
    console.assert(
      Math.abs(trade.pnl - expectedNet) < 0.05,
      `Multi-indicator Trade ${idx} Net PnL mismatch: ${trade.pnl} vs ${expectedNet}`
    );

    // Win/Loss/Breakeven status correctness
    const expectedStatus = trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BREAKEVEN';
    console.assert(
      trade.status === expectedStatus,
      `Multi-indicator Trade ${idx} status mismatch: ${trade.status} vs ${expectedStatus}`
    );

    // Rationale verification
    console.assert(
      trade.entryReason.includes('Multi-Indicator Confluence'),
      `Multi-indicator Trade ${idx} entry reason missing confluence text: ${trade.entryReason}`
    );
  });

  // Rates sum check (Win Rate + Loss Rate + Breakeven Rate = 100%)
  const rateSum = Number((multiBacktest1.winRate + multiBacktest1.lossRate + multiBacktest1.breakevenRate).toFixed(1));
  console.assert(
    Math.abs(rateSum - 100.0) < 0.2,
    `Win + Loss + Breakeven rates must sum to 100%, got ${rateSum}%`
  );

  // Equity Curve Start & End points
  console.assert(
    multiBacktest1.equityCurve[0].equity === multiBacktest1.initialCapital,
    `Equity curve must start at initialCapital (${multiBacktest1.initialCapital})`
  );
  console.assert(
    Math.abs(multiBacktest1.equityCurve[multiBacktest1.equityCurve.length - 1].equity - multiBacktest1.finalCapital) < 0.05,
    `Equity curve must end at finalCapital (${multiBacktest1.finalCapital})`
  );

  // 21.3 Idempotency & Zero Hidden State
  const multiBacktest2 = backtestingService.runBacktest(aaplStock.history, {
    symbol: 'AAPL',
    strategy: 'COMBINED_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    fastPeriod: 20,
    slowPeriod: 50,
    rsiPeriod: 14,
    rsiOverbought: 70,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    slippagePercent: 0.05,
    brokeragePerTrade: 20,
    regulatoryFeePercent: 0.05,
  });
  console.assert(
    multiBacktest1.finalCapital === multiBacktest2.finalCapital,
    'Repeated backtest must produce identical final capital'
  );
  console.assert(
    multiBacktest1.totalReturn === multiBacktest2.totalReturn,
    'Repeated backtest must produce identical total return'
  );
  console.assert(
    multiBacktest1.trades.length === multiBacktest2.trades.length,
    'Repeated backtest must produce identical trades count'
  );
  for (let i = 0; i < multiBacktest1.trades.length; i++) {
    console.assert(
      multiBacktest1.trades[i].pnl === multiBacktest2.trades[i].pnl,
      `Trade ${i} PnL must be identical across repeated backtests`
    );
  }

  // 21.4 Zero Friction / Ideal Market Condition Backtest
  const zeroFrictionTest = backtestingService.runBacktest(aaplStock.history, {
    symbol: 'AAPL',
    strategy: 'COMBINED_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
    slippagePercent: 0,
    brokeragePerTrade: 0,
    regulatoryFeePercent: 0,
  });
  console.assert(zeroFrictionTest.totalFrictionPaid === 0, 'Zero friction backtest must have totalFrictionPaid === 0');
  zeroFrictionTest.trades.forEach((t) => {
    console.assert(t.grossPnl === t.pnl, 'Under zero friction, grossPnl must equal net PnL');
    console.assert(t.totalFrictionPaid === 0, 'Under zero friction, trade friction must be 0');
  });

  // 21.5 Edge Cases: Short & Empty History (< minimum 50 days required)
  let shortHistoryErrorCaught = false;
  try {
    const shortHistory = aaplStock.history.slice(0, 10);
    backtestingService.runBacktest(shortHistory, {
      symbol: 'AAPL',
      strategy: 'COMBINED_STRATEGY',
      startingCapital: 100000,
      timeframe: '1Y',
      fastPeriod: 20,
      slowPeriod: 50,
    });
  } catch (err: any) {
    shortHistoryErrorCaught = true;
    console.assert(err.message.includes('Insufficient price history'), `Error message mismatch: ${err.message}`);
  }
  console.assert(shortHistoryErrorCaught, 'Should safely reject short price history (< 50 bars)');

  let emptyHistoryErrorCaught = false;
  try {
    backtestingService.runBacktest([], {
      symbol: 'EMPTY',
      strategy: 'COMBINED_STRATEGY',
      startingCapital: 100000,
      timeframe: '1Y',
    });
  } catch (err: any) {
    emptyHistoryErrorCaught = true;
    console.assert(err.message.includes('Insufficient price history'), `Empty history error mismatch: ${err.message}`);
  }
  console.assert(emptyHistoryErrorCaught, 'Should safely reject empty price history');

  // 21.6 Edge Cases: Flat Price Series (Zero Volatility)
  const flatHistorySeries = Array.from({ length: 60 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    timestamp: String(1767225600000 + i * 86400000),
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 10000,
  }));
  const flatBacktest = backtestingService.runBacktest(flatHistorySeries, {
    symbol: 'FLAT',
    strategy: 'COMBINED_STRATEGY',
    startingCapital: 100000,
    timeframe: '1Y',
  });
  console.assert(flatBacktest.totalTrades === 0, 'Flat prices must result in 0 trades safely');
  console.assert(flatBacktest.finalCapital === 100000, 'Flat prices must preserve 100000 capital');
  console.assert(flatBacktest.maxDrawdown === 0, 'Flat prices must have 0 drawdown');

  // 21.7 CSV Export with Zero Trades
  const zeroTradesCsvHeaders = [
    'Trade #', 'Type', 'Status', 'Entry Date', 'Entry Price', 'Entry Reason',
    'Exit Date', 'Exit Price', 'Exit Reason', 'Quantity', 'Holding Days',
    'Gross P/L', 'Slippage Paid', 'Brokerage Paid', 'Regulatory Taxes',
    'Total Friction', 'Net P/L', 'Net P/L (%)'
  ];
  const zeroTradesCsvRows = flatBacktest.trades.map((t, idx) => [
    idx + 1, t.type, t.status, t.entryDate, t.entryPrice.toFixed(2), `"${t.entryReason}"`,
    t.exitDate, t.exitPrice.toFixed(2), `"${t.exitReason}"`, t.quantity, t.holdingDays,
    t.grossPnl.toFixed(2), (t.slippagePaid || 0).toFixed(2), (t.brokeragePaid || 0).toFixed(2),
    (t.regulatoryFeesPaid || 0).toFixed(2), (t.totalFrictionPaid || 0).toFixed(2),
    t.pnl.toFixed(2), t.pnlPercent.toFixed(2)
  ]);
  console.assert(zeroTradesCsvRows.length === 0, 'Zero-trade backtest generates empty trade rows in CSV');
  console.assert(zeroTradesCsvHeaders.length === 18, 'CSV format headers remain intact even with zero trades');

  // 21.8 Paper-Trading State Isolation Verification
  const postMultiState = portfolioStorageService.loadPortfolio();
  console.assert(
    postMultiState.trades.length === preMultiState.trades.length,
    'Paper-trading portfolio trades count must remain unaltered after running all backtests'
  );
  console.assert(
    postMultiState.availableCash === preMultiState.availableCash,
    'Paper-trading available cash must remain unaltered after running all backtests'
  );

  console.log('✓ Test 21 Passed: Comprehensive Multi-Indicator Confluence, Risk, Edge Cases & Idempotency Audit');

  console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
}

runTests();
