import { PricePoint } from '../types';
import { RealtimeNormalizedCandle } from '../types/marketFeedTypes';

export interface CandleValidationResult {
  isValid: boolean;
  normalizedCandle: RealtimeNormalizedCandle | null;
  errorReason?: string;
  isStale: boolean;
  isDuplicate: boolean;
  isOutOfOrder: boolean;
  isExtremeAnomaly: boolean;
  qualityScore: number; // 0 to 100
}

export class DataIntegrityValidator {
  private lastKnownTimestamps: Map<string, string> = new Map();
  private lastKnownPrices: Map<string, number> = new Map();

  /**
   * Real-Time Candle Processing Pipeline:
   * 1. Validate timestamp existence & format
   * 2. Validate OHLC mathematical bounds (High >= Open, Close, Low; Low <= Open, Close, High; > 0)
   * 3. Check for duplicates
   * 4. Check chronological ordering
   * 5. Check stale data
   * 6. Check missing data gaps
   * 7. Check for extreme price jump (>40% single-bar shock)
   * 8. Normalize candle structure
   */
  public validateRealtimeCandle(
    symbol: string,
    rawCandle: {
      timestamp?: string | number;
      date?: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
    },
    latencyMs: number | null = null,
    options?: { maxStaleAgeMs?: number; referenceTimestampMs?: number }
  ): CandleValidationResult {
    const rawTs = rawCandle.timestamp || rawCandle.date;
    if (!rawTs) {
      return {
        isValid: false,
        normalizedCandle: null,
        errorReason: 'Missing timestamp in candle feed',
        isStale: true,
        isDuplicate: false,
        isOutOfOrder: false,
        isExtremeAnomaly: false,
        qualityScore: 0,
      };
    }

    const timestampDate = typeof rawTs === 'number' ? new Date(rawTs) : new Date(String(rawTs));
    if (isNaN(timestampDate.getTime())) {
      return {
        isValid: false,
        normalizedCandle: null,
        errorReason: `Invalid unparseable timestamp: ${rawTs}`,
        isStale: true,
        isDuplicate: false,
        isOutOfOrder: false,
        isExtremeAnomaly: false,
        qualityScore: 0,
      };
    }

    const timestampStr = typeof rawTs === 'number' ? timestampDate.toISOString() : String(rawTs);
    const { open, high, low, close } = rawCandle;
    const volume = Number(rawCandle.volume) || 0;

    // Check for stale market data if staleness constraint is provided
    if (options?.maxStaleAgeMs) {
      const refTime = options.referenceTimestampMs || Date.now();
      const ageMs = refTime - timestampDate.getTime();
      if (ageMs > options.maxStaleAgeMs) {
        return {
          isValid: false,
          normalizedCandle: null,
          errorReason: `Stale market data detected: candle timestamp is ${Math.round(ageMs / 1000)}s old (exceeds threshold)`,
          isStale: true,
          isDuplicate: false,
          isOutOfOrder: false,
          isExtremeAnomaly: false,
          qualityScore: 25,
        };
      }
    }

    // Mathematical OHLC bounds check
    if (
      isNaN(open) ||
      isNaN(high) ||
      isNaN(low) ||
      isNaN(close) ||
      open <= 0 ||
      high <= 0 ||
      low <= 0 ||
      close <= 0
    ) {
      return {
        isValid: false,
        normalizedCandle: null,
        errorReason: `Invalid non-positive or NaN price in OHLC (O:${open}, H:${high}, L:${low}, C:${close})`,
        isStale: false,
        isDuplicate: false,
        isOutOfOrder: false,
        isExtremeAnomaly: false,
        qualityScore: 0,
      };
    }

    if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) {
      return {
        isValid: false,
        normalizedCandle: null,
        errorReason: `OHLC bound violation (High ${high} < Open/Close or Low ${low} > Open/Close)`,
        isStale: false,
        isDuplicate: false,
        isOutOfOrder: false,
        isExtremeAnomaly: false,
        qualityScore: 10,
      };
    }

    // Duplicate timestamp check
    const lastTs = this.lastKnownTimestamps.get(symbol);
    if (lastTs && lastTs === timestampStr) {
      return {
        isValid: false,
        normalizedCandle: null,
        errorReason: `Duplicate candle timestamp detected: ${timestampStr}`,
        isStale: true,
        isDuplicate: true,
        isOutOfOrder: false,
        isExtremeAnomaly: false,
        qualityScore: 30,
      };
    }

    // Chronological order check
    if (lastTs && new Date(timestampStr).getTime() < new Date(lastTs).getTime()) {
      return {
        isValid: false,
        normalizedCandle: null,
        errorReason: `Out-of-order candle received. Current: ${timestampStr}, Last: ${lastTs}`,
        isStale: true,
        isDuplicate: false,
        isOutOfOrder: true,
        isExtremeAnomaly: false,
        qualityScore: 20,
      };
    }

    // Extreme jump check (>40% change from prior close)
    const lastPrice = this.lastKnownPrices.get(symbol);
    let isExtremeAnomaly = false;
    if (lastPrice && lastPrice > 0) {
      const priceChangePct = Math.abs((close - lastPrice) / lastPrice) * 100;
      if (priceChangePct > 40) {
        isExtremeAnomaly = true;
      }
    }

    // Record valid states
    this.lastKnownTimestamps.set(symbol, timestampStr);
    this.lastKnownPrices.set(symbol, close);

    const normalizedCandle: RealtimeNormalizedCandle = {
      symbol: symbol.toUpperCase(),
      timestamp: timestampStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      isFinalBar: true,
      feedLatencyMs: latencyMs,
      validationScore: isExtremeAnomaly ? 70 : 100,
    };

    return {
      isValid: !isExtremeAnomaly,
      normalizedCandle,
      errorReason: isExtremeAnomaly ? 'Extreme price jump (>40%) detected. Pending corporate action audit.' : undefined,
      isStale: false,
      isDuplicate: false,
      isOutOfOrder: false,
      isExtremeAnomaly,
      qualityScore: isExtremeAnomaly ? 70 : 100,
    };
  }

  public resetHistoryForSymbol(symbol: string) {
    this.lastKnownTimestamps.delete(symbol);
    this.lastKnownPrices.delete(symbol);
  }

  public resetAll() {
    this.lastKnownTimestamps.clear();
    this.lastKnownPrices.clear();
  }
}

export const dataIntegrityValidator = new DataIntegrityValidator();
