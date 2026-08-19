import { PricePoint } from '../types';

/**
 * Deterministic multi-regime historical market data generator.
 * Produces 1,000+ bars per asset with explicit, distinct market regimes:
 *  1. Bull Market (expansion)
 *  2. High-Volatility Distribution (chop)
 *  3. Bear Market (prolonged downtrend)
 *  4. Low-Volatility Consolidation (tight range)
 *  5. Sharp Flash Crash & V-Recovery (stress event)
 *  6. Secondary Bull Trend (recovery)
 */

export interface MarketRegimeSpec {
  name: string;
  code: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'HIGH_VOL' | 'LOW_VOL' | 'FLASH_CRASH' | 'MULTI_REGIME';
  description: string;
  bars: number;
  volatility: number;
  trend: number;
  shockMagnitude?: number; // e.g. -0.25 for crash
}

/**
 * Seeded PRNG for deterministic reproducibility.
 */
export function createDeterministicRNG(seedStr: string) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  return () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

/**
 * Generates an extended 1,000+ bar multi-regime historical price series.
 */
export function generateExtendedMultiRegimeHistory(
  symbol: string,
  basePrice: number,
  totalBars: number = 1050
): PricePoint[] {
  const points: PricePoint[] = [];
  let currentPrice = basePrice;
  const now = new Date(2026, 7, 15); // Anchor to fixed reference date 2026-08-15
  const rng = createDeterministicRNG(`EXTENDED_REGIME_${symbol}_${basePrice}`);

  // Schedule regime phases across the 1050 bars:
  // Bars 0-220: Bull Market (trend = +0.0009, vol = 0.015)
  // Bars 220-380: High-Volatility Chop (trend = +0.0001, vol = 0.032)
  // Bars 380-560: Bear Market (trend = -0.0012, vol = 0.024)
  // Bars 560-720: Low-Volatility Consolidation (trend = 0.0000, vol = 0.008)
  // Bars 720-860: Flash Crash & Recovery (shock of -22% then steep bounce, vol = 0.035)
  // Bars 860-1050: Secondary Bull Trend (trend = +0.0008, vol = 0.016)

  // Construct dates going backwards from anchor date, skipping weekends
  const dates: string[] = [];
  const currDate = new Date(now);
  while (dates.length < totalBars) {
    if (currDate.getDay() !== 0 && currDate.getDay() !== 6) {
      dates.unshift(currDate.toISOString().split('T')[0]);
    }
    currDate.setDate(currDate.getDate() - 1);
  }

  for (let i = 0; i < totalBars; i++) {
    const dateStr = dates[i];
    let volatility = 0.018;
    let trend = 0.0004;

    if (i < 220) {
      // Phase 1: Bull Expansion
      volatility = 0.015;
      trend = 0.0009;
    } else if (i < 380) {
      // Phase 2: High Volatility Chop
      volatility = 0.032;
      trend = 0.0001;
    } else if (i < 560) {
      // Phase 3: Bear Market Downtrend
      volatility = 0.024;
      trend = -0.0012;
    } else if (i < 720) {
      // Phase 4: Low Volatility Rangebound Compression
      volatility = 0.008;
      trend = 0.0000;
    } else if (i < 760) {
      // Phase 5a: Flash Crash Drop (Steep 40 bars)
      volatility = 0.038;
      trend = -0.0035;
    } else if (i < 860) {
      // Phase 5b: Violent V-Shape Recovery
      volatility = 0.030;
      trend = 0.0028;
    } else {
      // Phase 6: Secondary Bull Expansion
      volatility = 0.016;
      trend = 0.0008;
    }

    const rand = rng() - 0.48; // slight upward drift baseline
    const change = currentPrice * (rand * volatility + trend);
    const open = currentPrice;
    const close = Math.max(1, open + change);
    const dayVol = currentPrice * (volatility * 0.7);
    const high = Math.max(open, close) + rng() * dayVol;
    const low = Math.max(0.5, Math.min(open, close) - rng() * dayVol);
    const volume = Math.floor(1200000 + rng() * 9500000);

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

/**
 * Generates an isolated pure regime series for stress testing.
 */
export function generatePureRegimeHistory(
  symbol: string,
  basePrice: number,
  regime: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'HIGH_VOL' | 'LOW_VOL' | 'FLASH_CRASH',
  bars: number = 300
): PricePoint[] {
  const points: PricePoint[] = [];
  let currentPrice = basePrice;
  const now = new Date(2026, 7, 15);
  const rng = createDeterministicRNG(`PURE_REGIME_${regime}_${symbol}_${basePrice}`);

  const dates: string[] = [];
  const currDate = new Date(now);
  while (dates.length < bars) {
    if (currDate.getDay() !== 0 && currDate.getDay() !== 6) {
      dates.unshift(currDate.toISOString().split('T')[0]);
    }
    currDate.setDate(currDate.getDate() - 1);
  }

  let volatility = 0.02;
  let trend = 0.0;

  switch (regime) {
    case 'BULL':
      volatility = 0.016;
      trend = 0.0012;
      break;
    case 'BEAR':
      volatility = 0.026;
      trend = -0.0014;
      break;
    case 'SIDEWAYS':
      volatility = 0.012;
      trend = 0.0000;
      break;
    case 'HIGH_VOL':
      volatility = 0.040;
      trend = 0.0002;
      break;
    case 'LOW_VOL':
      volatility = 0.006;
      trend = 0.0001;
      break;
    case 'FLASH_CRASH':
      volatility = 0.035;
      trend = -0.0005;
      break;
  }

  for (let i = 0; i < bars; i++) {
    const dateStr = dates[i];
    let currentTrend = trend;
    let currentVol = volatility;

    if (regime === 'FLASH_CRASH') {
      // In flash crash, drop sharply on bars 80-110, then sharp rebound on 110-160
      if (i >= 80 && i < 110) {
        currentTrend = -0.006;
        currentVol = 0.045;
      } else if (i >= 110 && i < 160) {
        currentTrend = 0.0045;
        currentVol = 0.038;
      }
    }

    const rand = rng() - 0.48;
    const change = currentPrice * (rand * currentVol + currentTrend);
    const open = currentPrice;
    const close = Math.max(1, open + change);
    const dayVol = currentPrice * (currentVol * 0.75);
    const high = Math.max(open, close) + rng() * dayVol;
    const low = Math.max(0.5, Math.min(open, close) - rng() * dayVol);
    const volume = Math.floor(1000000 + rng() * 8000000);

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
