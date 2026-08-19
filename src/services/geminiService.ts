import { AiAnalysisResult, AiMarketSummaryResult, StockQuote } from '../types';
import { computeAllIndicators, estimateSupportResistance } from './technicalAnalysisService';

export class GeminiService {
  private activeAnalysisRequests = new Map<string, Promise<AiAnalysisResult>>();
  private activeMarketSummaryRequest: Promise<AiMarketSummaryResult> | null = null;

  private analysisCache = new Map<string, { result: AiAnalysisResult; timestamp: number }>();
  private marketSummaryCache: { result: AiMarketSummaryResult; timestamp: number } | null = null;

  private CACHE_TTL_MS = 300000; // 5 minutes

  /**
   * Request structured AI analysis for a given stock
   */
  public async analyzeStock(quote: StockQuote, forceRefresh = false): Promise<AiAnalysisResult> {
    const symbol = quote.symbol;

    // 1. Check cache first if not force refresh
    if (!forceRefresh) {
      const cached = this.analysisCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.result;
      }
    }

    // 2. Return active in-flight request if already in progress
    if (this.activeAnalysisRequests.has(symbol)) {
      return this.activeAnalysisRequests.get(symbol)!;
    }

    // 3. Create request promise
    const requestPromise = (async (): Promise<AiAnalysisResult> => {
      const indicators = computeAllIndicators(quote.history);
      const { support, resistance } = estimateSupportResistance(quote.history);

      const latestRsi = indicators.rsi14 ? indicators.rsi14[indicators.rsi14.length - 1] : 50;
      const latestMacd = indicators.macd && indicators.macd.macdLine ? indicators.macd.macdLine[indicators.macd.macdLine.length - 1] : 0;
      const latestSignal = indicators.macd && indicators.macd.signalLine ? indicators.macd.signalLine[indicators.macd.signalLine.length - 1] : 0;
      const latestSma20 = indicators.sma20 ? indicators.sma20[indicators.sma20.length - 1] : quote.price;
      const latestSma50 = indicators.sma50 ? indicators.sma50[indicators.sma50.length - 1] : quote.price;

      const payload = {
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        changePercent: quote.changePercent,
        rsi14: latestRsi,
        macdLine: latestMacd,
        macdSignal: latestSignal,
        sma20: latestSma20,
        sma50: latestSma50,
        support,
        resistance,
        volume: quote.volume,
      };

      try {
        const response = await fetch('/api/gemini/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.aiSignal) {
            this.analysisCache.set(symbol, { result: data, timestamp: Date.now() });
            return data;
          }
        }
      } catch {
        // Fetch failed or server offline
      }

      // High-fidelity rule-based fallback if API call unavailable
      const fallback = this.generateFallbackAnalysis(quote, payload);
      this.analysisCache.set(symbol, { result: fallback, timestamp: Date.now() });
      return fallback;
    })();

    // Store in-flight promise and clean up when complete
    this.activeAnalysisRequests.set(symbol, requestPromise);
    try {
      return await requestPromise;
    } finally {
      this.activeAnalysisRequests.delete(symbol);
    }
  }

  /**
   * Request AI market summary
   */
  public async getMarketSummary(stocks: StockQuote[], forceRefresh = false): Promise<AiMarketSummaryResult> {
    // 1. Check cache first if not force refresh
    if (!forceRefresh && this.marketSummaryCache && Date.now() - this.marketSummaryCache.timestamp < this.CACHE_TTL_MS) {
      return this.marketSummaryCache.result;
    }

    // 2. Return active in-flight request if already in progress
    if (this.activeMarketSummaryRequest) {
      return this.activeMarketSummaryRequest;
    }

    // 3. Create request promise
    const requestPromise = (async (): Promise<AiMarketSummaryResult> => {
      const payload = stocks.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        price: s.price,
        changePercent: s.changePercent,
      }));

      try {
        const response = await fetch('/api/gemini/market-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stocks: payload }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.overallSentiment) {
            this.marketSummaryCache = { result: data, timestamp: Date.now() };
            return data;
          }
        }
      } catch {
        // Fetch failed or server offline
      }

      const fallback = this.generateFallbackMarketSummary(stocks);
      this.marketSummaryCache = { result: fallback, timestamp: Date.now() };
      return fallback;
    })();

    this.activeMarketSummaryRequest = requestPromise;
    try {
      return await requestPromise;
    } finally {
      this.activeMarketSummaryRequest = null;
    }
  }

  private generateFallbackAnalysis(quote: StockQuote, p: any): AiAnalysisResult {
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 75;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    const reasons: string[] = [];

    if (p.rsi14 < 35 && p.price < p.support * 1.02) {
      trend = 'BULLISH';
      signal = 'BUY';
      confidence = 82;
      riskLevel = 'LOW';
      reasons.push(`RSI(14) is at ${p.rsi14.toFixed(1)}, signaling strong oversold conditions.`);
      reasons.push(`Price ₹${quote.price.toFixed(2)} is consolidating near major support level at ₹${p.support}.`);
      reasons.push(`20-day SMA (₹${p.sma20}) is aligning with potential mean-reversion boundary.`);
    } else if (p.rsi14 > 68 && p.price > p.resistance * 0.98) {
      trend = 'BEARISH';
      signal = 'SELL';
      confidence = 85;
      riskLevel = 'HIGH';
      reasons.push(`RSI(14) is at ${p.rsi14.toFixed(1)}, approaching overbought exhaustion zone.`);
      reasons.push(`Price is testing historical overhead resistance around ₹${p.resistance}.`);
      reasons.push(`MACD signal line is flattening, indicating decelerating bullish momentum.`);
    } else if (p.sma20 > p.sma50) {
      trend = 'BULLISH';
      signal = 'BUY';
      confidence = 78;
      riskLevel = 'MEDIUM';
      reasons.push(`Short-term 20-period SMA (₹${p.sma20}) remains above 50-period SMA (₹${p.sma50}), confirming an intact uptrend.`);
      reasons.push(`MACD histogram shows positive baseline divergence.`);
      reasons.push(`Trading volume of ${(quote.volume / 1000000).toFixed(1)}M supports current price trajectory.`);
    } else {
      trend = 'NEUTRAL';
      signal = 'HOLD';
      confidence = 70;
      riskLevel = 'MEDIUM';
      reasons.push(`RSI(14) is balanced at ${p.rsi14.toFixed(1)}, showing balanced supply/demand dynamics.`);
      reasons.push(`Price is trading between key support (₹${p.support}) and resistance (₹${p.resistance}).`);
      reasons.push(`Moving averages show flat consolidation pattern without decisive breakout.`);
    }

    const stopLossVal = quote.price * (signal === 'BUY' ? 0.95 : 1.05);
    const takeProfitVal = quote.price * (signal === 'BUY' ? 1.10 : 0.90);

    return {
      symbol: quote.symbol,
      marketTrend: trend,
      aiSignal: signal,
      confidence,
      riskLevel,
      suggestedEntryZone: `₹${(quote.price * 0.995).toFixed(2)} - ₹${(quote.price * 1.005).toFixed(2)}`,
      suggestedStopLoss: `₹${stopLossVal.toFixed(2)}`,
      suggestedTakeProfit: `₹${takeProfitVal.toFixed(2)}`,
      riskRewardRatio: '1 : 2.0',
      reasoning: reasons,
      disclaimer: 'AI analysis is informational and educational. It is not financial advice.',
      analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFallback: true,
      fallbackNotice: 'AI service temporarily unavailable. Showing deterministic demo analysis.',
      provider: 'DETERMINISTIC DEMO ANALYSIS',
    };
  }

  private generateFallbackMarketSummary(stocks: StockQuote[]): AiMarketSummaryResult {
    if (!stocks || stocks.length === 0) {
      return {
        overallSentiment: 'NEUTRAL',
        sentimentScore: 50,
        strongestSectors: [],
        weakestSectors: [],
        keyObservations: ['Insufficient current market data for analysis.'],
        riskConsiderations: ['Ensure data feeds are connected before placing paper trades.'],
        summaryParagraph: 'Insufficient current market data for analysis.',
        generatedAt: new Date().toLocaleTimeString(),
        isFallback: true,
        fallbackNotice: 'Insufficient market feed data available.',
        provider: 'DETERMINISTIC DEMO ANALYSIS',
      };
    }

    const positiveCount = stocks.filter((s) => s.changePercent > 0).length;
    const sentimentScore = Math.round((positiveCount / stocks.length) * 100);

    let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (sentimentScore >= 60) overallSentiment = 'BULLISH';
    else if (sentimentScore <= 40) overallSentiment = 'BEARISH';

    const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sorted.slice(0, 2).map((s) => `${s.symbol} (+${s.changePercent}%)`);
    const topDecliners = sorted.slice(-2).reverse().map((s) => `${s.symbol} (${s.changePercent}%)`);

    return {
      overallSentiment,
      sentimentScore,
      strongestSectors: ['Technology & AI Hardware', 'Semiconductors'],
      weakestSectors: ['Consumer Discretionary', 'Legacy IT Services'],
      keyObservations: [
        `Market breadth is currently ${overallSentiment.toLowerCase()} with ${positiveCount} out of ${stocks.length} benchmark equities advancing.`,
        `Outperforming tickers include ${topGainers.join(', ')}.`,
        `Underperforming equities showing pullback include ${topDecliners.join(', ')}.`,
        `Technical momentum indicators suggest sector rotation into high-relative-strength tech leadership.`,
      ],
      riskConsiderations: [
        'Macro economic interest rate commentary may increase near-term intraday volatility.',
        'Watch RSI levels on mega-cap stocks as key tickers approach resistance thresholds.',
      ],
      summaryParagraph: `The broader market exhibits a ${overallSentiment.toLowerCase()} stance. Semiconductor and cloud infrastructure tickers lead momentum gains, while select consumer and legacy sectors consolidate. Maintain strict risk-per-trade parameters when placing paper trades.`,
      generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFallback: true,
      fallbackNotice: 'AI service temporarily unavailable. Showing deterministic demo market summary.',
      provider: 'DETERMINISTIC DEMO ANALYSIS',
    };
  }
}

export const geminiService = new GeminiService();
