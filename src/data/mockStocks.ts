import { PricePoint, StockQuote } from '../types';

/**
 * Generates realistic deterministic historical price series for any symbol.
 */
export function generateStockHistory(
  symbol: string,
  basePrice: number,
  volatility: number = 0.02,
  trend: number = 0.0005,
  days: number = 250
): PricePoint[] {
  const points: PricePoint[] = [];
  let currentPrice = basePrice;
  const anchorDate = new Date('2026-08-18T00:00:00Z');

  // Seed pseudo random based on symbol characters
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed += symbol.charCodeAt(i) * (i + 1);
  }
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = days; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    // Skip weekends for realistic trading calendar
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;

    const rand = pseudoRandom() - 0.48; // Slight drift
    const change = currentPrice * (rand * volatility + trend);
    const open = currentPrice;
    const close = Math.max(1, open + change);
    const dayVolatility = currentPrice * (volatility * 0.8);
    const high = Math.max(open, close) + pseudoRandom() * dayVolatility;
    const low = Math.min(open, close) - pseudoRandom() * dayVolatility;
    const volume = Math.floor(1000000 + pseudoRandom() * 9000000);

    const dateStr = d.toISOString().split('T')[0];

    points.push({
      timestamp: dateStr,
      date: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  return points;
}

const defaultStocks: Omit<StockQuote, 'history' | 'sparkline'>[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    price: 228.50,
    change: 3.40,
    changePercent: 1.51,
    open: 225.10,
    high: 229.10,
    low: 224.80,
    previousClose: 225.10,
    volume: 52430000,
    marketCap: '$3.51 T',
    peRatio: 34.2,
    marketStatus: 'OPEN',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    price: 442.15,
    change: -2.30,
    changePercent: -0.52,
    open: 444.80,
    high: 446.20,
    low: 440.90,
    previousClose: 444.45,
    volume: 21850000,
    marketCap: '$3.28 T',
    peRatio: 36.8,
    marketStatus: 'OPEN',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Semiconductors',
    price: 128.40,
    change: 5.80,
    changePercent: 4.73,
    open: 123.50,
    high: 129.80,
    low: 122.90,
    previousClose: 122.60,
    volume: 89400000,
    marketCap: '$3.15 T',
    peRatio: 72.4,
    marketStatus: 'OPEN',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Consumer Cyclical',
    price: 186.75,
    change: 1.85,
    changePercent: 1.00,
    open: 185.20,
    high: 187.90,
    low: 184.60,
    previousClose: 184.90,
    volume: 38200000,
    marketCap: '$1.94 T',
    peRatio: 43.1,
    marketStatus: 'OPEN',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Automotive / EV',
    price: 215.30,
    change: -6.40,
    changePercent: -2.89,
    open: 221.50,
    high: 222.80,
    low: 213.90,
    previousClose: 221.70,
    volume: 64100000,
    marketCap: '$685.2 B',
    peRatio: 58.6,
    marketStatus: 'OPEN',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Communication Services',
    price: 178.20,
    change: 0.95,
    changePercent: 0.54,
    open: 177.50,
    high: 179.40,
    low: 176.80,
    previousClose: 177.25,
    volume: 24300000,
    marketCap: '$2.21 T',
    peRatio: 26.5,
    marketStatus: 'OPEN',
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy & Conglomerate',
    price: 2950.40,
    change: 32.60,
    changePercent: 1.12,
    open: 2920.00,
    high: 2965.00,
    low: 2915.00,
    previousClose: 2917.80,
    volume: 7850000,
    marketCap: '₹19.9 T',
    peRatio: 28.4,
    marketStatus: 'OPEN',
  },
  {
    symbol: 'INFY',
    name: 'Infosys Limited',
    sector: 'IT Services',
    price: 1820.75,
    change: -14.20,
    changePercent: -0.77,
    open: 1835.00,
    high: 1842.00,
    low: 1812.00,
    previousClose: 1834.95,
    volume: 5420000,
    marketCap: '₹7.56 T',
    peRatio: 25.1,
    marketStatus: 'OPEN',
  },
];

export const MOCK_STOCKS: StockQuote[] = defaultStocks.map((stock) => {
  const history = generateStockHistory(stock.symbol, stock.price);
  const sparkline = history.slice(-20).map((p) => p.close);
  const latestPrice = history[history.length - 1].close;
  const prevPrice = history[history.length - 2].close;
  const change = Number((latestPrice - prevPrice).toFixed(2));
  const changePercent = Number(((change / prevPrice) * 100).toFixed(2));

  return {
    ...stock,
    price: latestPrice,
    change,
    changePercent,
    sparkline,
    history,
  };
});

export function getStockBySymbol(symbol: string): StockQuote {
  const normalized = symbol.trim().toUpperCase();
  const found = MOCK_STOCKS.find((s) => s.symbol === normalized);
  if (found) return found;

  // Dynamically generate quote for unknown symbol
  const basePrice = 150 + (symbol.length * 27) % 300;
  const history = generateStockHistory(normalized, basePrice);
  const sparkline = history.slice(-20).map((p) => p.close);
  const latestPrice = history[history.length - 1].close;
  const prevPrice = history[history.length - 2].close;
  const change = Number((latestPrice - prevPrice).toFixed(2));
  const changePercent = Number(((change / prevPrice) * 100).toFixed(2));

  return {
    symbol: normalized,
    name: `${normalized} Global Corp.`,
    sector: 'Diversified Markets',
    price: latestPrice,
    change,
    changePercent,
    open: Number((latestPrice * 0.995).toFixed(2)),
    high: Number((latestPrice * 1.012).toFixed(2)),
    low: Number((latestPrice * 0.988).toFixed(2)),
    previousClose: prevPrice,
    volume: 12500000,
    marketCap: '$450 B',
    peRatio: 22.4,
    marketStatus: 'OPEN',
    sparkline,
    history,
  };
}
