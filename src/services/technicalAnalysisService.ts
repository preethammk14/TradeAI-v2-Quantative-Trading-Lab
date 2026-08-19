import { PricePoint, TechnicalIndicators } from '../types';

/**
 * Calculates Simple Moving Average (SMA) for an array of numbers.
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      result.push(Number((sum / period).toFixed(2)));
    }
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA) for an array of numbers.
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      const slice = data.slice(0, period);
      const sma = slice.reduce((acc, val) => acc + val, 0) / period;
      result.push(Number(sma.toFixed(2)));
    } else {
      const prevEma = result[i - 1];
      const currentEma = (data[i] - prevEma) * multiplier + prevEma;
      result.push(Number(currentEma.toFixed(2)));
    }
  }
  return result;
}

/**
 * Calculates Relative Strength Index (RSI) for period 14.
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsiValues: number[] = [];
  if (prices.length <= period) {
    return prices.map(() => 50);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  // First average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  rsiValues.push(NaN); // index 0
  for (let i = 1; i <= period; i++) {
    rsiValues.push(NaN);
  }

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRsi = 100 - 100 / (1 + firstRs);
  rsiValues[period] = Number(firstRsi.toFixed(2));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsiValues.push(Number(rsi.toFixed(2)));
  }

  return rsiValues;
}

/**
 * Calculates MACD (12, 26, 9)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fastEma = calculateEMA(prices, fastPeriod);
  const slowEma = calculateEMA(prices, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(Number((fastEma[i] - slowEma[i]).toFixed(2)));
    }
  }

  // Filter out NaNs for signal calculation
  const validMacdValues = macdLine.filter((val) => !isNaN(val));
  const signalEma = calculateEMA(validMacdValues, signalPeriod);

  const signalLine: number[] = [];
  const histogram: number[] = [];

  let validIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) {
      signalLine.push(NaN);
      histogram.push(NaN);
    } else {
      const sig = signalEma[validIndex];
      signalLine.push(sig);
      if (isNaN(sig)) {
        histogram.push(NaN);
      } else {
        histogram.push(Number((macdLine[i] - sig).toFixed(2)));
      }
      validIndex++;
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Calculates Bollinger Bands (20 period, 2 StdDev)
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const sma = calculateSMA(prices, period);
  const upper: number[] = [];
  const middle: number[] = sma;
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (isNaN(sma[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance =
        slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      upper.push(Number((mean + multiplier * stdDev).toFixed(2)));
      lower.push(Number((mean - multiplier * stdDev).toFixed(2)));
    }
  }

  return { upper, middle, lower };
}

/**
 * Calculates Average True Range (ATR) using standard Wilder's / causal smoothing
 */
export function calculateATR(history: PricePoint[], period: number = 14): number[] {
  const result: number[] = [];
  if (!history || history.length === 0) return result;

  const tr: number[] = [];
  for (let i = 0; i < history.length; i++) {
    const curr = history[i];
    if (i === 0) {
      tr.push(curr.high - curr.low);
    } else {
      const prevClose = history[i - 1].close;
      const hl = curr.high - curr.low;
      const hpc = Math.abs(curr.high - prevClose);
      const lpc = Math.abs(curr.low - prevClose);
      tr.push(Math.max(hl, hpc, lpc));
    }
  }

  for (let i = 0; i < history.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      const initialSum = tr.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(Number((initialSum / period).toFixed(2)));
    } else {
      const prevAtr = result[i - 1];
      const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
      result.push(Number(currentAtr.toFixed(2)));
    }
  }
  return result;
}

/**
 * Helper to compute all technical indicators for a history array of price points
 */
export function computeAllIndicators(history: PricePoint[]): TechnicalIndicators {
  const closePrices = history.map((p) => p.close);
  const sma20 = calculateSMA(closePrices, 20);
  const sma50 = calculateSMA(closePrices, 50);
  const ema20 = calculateEMA(closePrices, 20);
  const rsi14 = calculateRSI(closePrices, 14);
  const macd = calculateMACD(closePrices, 12, 26, 9);
  const bollingerBands = calculateBollingerBands(closePrices, 20, 2);

  return {
    sma20,
    sma50,
    ema20,
    rsi14,
    macd,
    bollingerBands,
  };
}

/**
 * Estimate Support and Resistance levels from swing highs/lows
 */
export function estimateSupportResistance(history: PricePoint[]): {
  support: number;
  resistance: number;
} {
  if (!history || history.length === 0) {
    return { support: 0, resistance: 0 };
  }
  const recent = history.slice(-30);
  const lows = recent.map((p) => p.low);
  const highs = recent.map((p) => p.high);

  const support = Math.min(...lows);
  const resistance = Math.max(...highs);

  return {
    support: Number(support.toFixed(2)),
    resistance: Number(resistance.toFixed(2)),
  };
}
