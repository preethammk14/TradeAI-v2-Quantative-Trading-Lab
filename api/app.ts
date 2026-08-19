import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { MOCK_STOCKS, getStockBySymbol } from '../src/data/mockStocks';

const app = express();
app.use(express.json());

// Initialize Gemini AI Client lazily/safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Quota & Rate Limit Protection State
let isQuotaExhausted = false;
let quotaExhaustedUntil = 0;
const QUOTA_COOL_OFF_MS = 300000; // 5 minutes

const checkQuotaState = (): boolean => {
  if (isQuotaExhausted && Date.now() < quotaExhaustedUntil) {
    return true;
  }
  isQuotaExhausted = false;
  return false;
};

const markQuotaExhausted = () => {
  isQuotaExhausted = true;
  quotaExhaustedUntil = Date.now() + QUOTA_COOL_OFF_MS;
};

// Safe wrapper for Gemini API calls with at most 1 retry for 503
const callGeminiWithProtection = async <T>(apiCallFn: () => Promise<T>): Promise<T> => {
  let attempts = 0;
  const maxAttempts = 2;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      return await apiCallFn();
    } catch (err: any) {
      const errMsg = String(err?.message || err || '');
      const is429 =
        err?.status === 429 ||
        err?.statusCode === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota');

      const is503 =
        err?.status === 503 ||
        err?.statusCode === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE');

      if (is429) {
        markQuotaExhausted();
        console.warn('[Gemini API] Quota limit reached (429). Switching to deterministic demo analysis.');
        throw new Error('429_QUOTA_EXHAUSTED');
      }

      if (is503) {
        if (attempts < maxAttempts) {
          console.warn(`[Gemini API] Service temporarily unavailable (503). Retrying attempt ${attempts + 1}/${maxAttempts}...`);
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }
      }

      console.warn(`[Gemini API] Request failed (attempt ${attempts}/${maxAttempts}):`, errMsg.slice(0, 150));
      throw err;
    }
  }
  throw new Error('MAX_ATTEMPTS_EXCEEDED');
};

// Helper for deterministic stock analysis fallback
const getDeterministicStockFallback = (stockData: any, notice: string) => {
  const rsi = Number(stockData.rsi14) || 50;
  const price = Number(stockData.price) || 100;
  const support = Number(stockData.support) || price * 0.95;
  const resistance = Number(stockData.resistance) || price * 1.05;
  const sma20 = Number(stockData.sma20) || price;
  const sma50 = Number(stockData.sma50) || price;

  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 75;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

  if (rsi < 35 && price < support * 1.02) {
    trend = 'BULLISH';
    signal = 'BUY';
    confidence = 82;
    riskLevel = 'LOW';
  } else if (rsi > 68 && price > resistance * 0.98) {
    trend = 'BEARISH';
    signal = 'SELL';
    confidence = 85;
    riskLevel = 'HIGH';
  } else if (sma20 > sma50) {
    trend = 'BULLISH';
    signal = 'BUY';
    confidence = 78;
    riskLevel = 'MEDIUM';
  }

  return {
    symbol: stockData.symbol,
    marketTrend: trend,
    aiSignal: signal,
    confidence,
    riskLevel,
    suggestedEntryZone: `₹${(price * 0.995).toFixed(2)} - ₹${(price * 1.005).toFixed(2)}`,
    suggestedStopLoss: `₹${(price * (signal === 'BUY' ? 0.95 : 1.05)).toFixed(2)}`,
    suggestedTakeProfit: `₹${(price * (signal === 'BUY' ? 1.10 : 0.90)).toFixed(2)}`,
    riskRewardRatio: '1 : 2.0',
    reasoning: [
      `RSI(14) calculated at ${rsi.toFixed(1)}, reflecting ${rsi < 40 ? 'oversold value' : rsi > 60 ? 'overbought value' : 'balanced momentum'}.`,
      `Price ₹${price.toFixed(2)} positioned relative to 20 SMA (₹${sma20.toFixed(2)}) and 50 SMA (₹${sma50.toFixed(2)}).`,
      `Key support identified at ₹${support.toFixed(2)} and overhead resistance at ₹${resistance.toFixed(2)}.`,
    ],
    disclaimer: 'AI analysis is informational and educational. It is not financial advice.',
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isFallback: true,
    fallbackNotice: notice,
    provider: 'DETERMINISTIC DEMO ANALYSIS',
  };
};

// Helper for deterministic market summary fallback
const getDeterministicMarketSummaryFallback = (stocks: any[], notice: string) => {
  if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
    return {
      overallSentiment: 'NEUTRAL',
      sentimentScore: 50,
      strongestSectors: ['Technology'],
      weakestSectors: ['Utilities'],
      keyObservations: ['Insufficient market feed for real-time analysis.'],
      riskConsiderations: ['Ensure simulated feeds remain connected.'],
      summaryParagraph: 'Market feeds indicate steady equilibrium across tracked assets.',
      generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFallback: true,
      fallbackNotice: notice,
      provider: 'DETERMINISTIC DEMO ANALYSIS',
    };
  }

  const pos = stocks.filter((s) => (s.changePercent || 0) > 0).length;
  const score = Math.round((pos / stocks.length) * 100);
  const overallSentiment = score >= 60 ? 'BULLISH' : score <= 40 ? 'BEARISH' : 'NEUTRAL';

  return {
    overallSentiment,
    sentimentScore: score,
    strongestSectors: ['Technology & AI Hardware', 'Semiconductors'],
    weakestSectors: ['Consumer Discretionary', 'Legacy IT'],
    keyObservations: [
      `${pos} of ${stocks.length} tracked benchmark equities are advancing.`,
      'Technology leadership continues driving positive relative strength.',
      'Range-bound consolidation observed in defensive sector equities.',
    ],
    riskConsiderations: [
      'Monitor major macroeconomic rate announcements.',
      'Apply disciplined position sizing on all simulated trades.',
    ],
    summaryParagraph: `The broader market exhibits a ${overallSentiment.toLowerCase()} stance. Semiconductor and hardware sectors lead momentum, while consumer sectors consolidate.`,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isFallback: true,
    fallbackNotice: notice,
    provider: 'DETERMINISTIC DEMO ANALYSIS',
  };
};

// Helper function to sanitize any error messages and prevent key leakage
const sanitizeMessage = (msg: string): string => {
  if (!msg) return '';
  let clean = msg;
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (alphaKey) {
    clean = clean.split(alphaKey.trim()).join('[REDACTED_API_KEY]');
  }
  clean = clean.replace(/key as [A-Za-z0-9]+/gi, 'key as [REDACTED_API_KEY]');
  return clean;
};

// 1. Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'TradeAI by PMK', timestamp: new Date().toISOString() });
});

// 2. Market data endpoints & Real-Data Provider Adapter
let alphaVantageCache: {
  timestamp: number;
  statusData: any;
} | null = null;

app.get('/api/market/provider-status', async (req, res) => {
  const requestedProvider = (req.query.provider as string) || 'alpha-vantage';
  const forceCheck = req.query.force === 'true';

  // 1. If DEMO / Synthetic replay provider requested
  if (requestedProvider === 'deterministic-replay' || requestedProvider === 'SIMULATED_REPLAY') {
    return res.json({
      provider: 'deterministic-replay',
      providerName: 'TradeAI Deterministic Historical Feed',
      providerType: 'SIMULATED_REPLAY',
      isConfigured: true,
      status: 'DEMO_SYNTHETIC_DATA',
      dataMode: 'SIMULATED',
      lastUpdateTimestamp: new Date().toISOString(),
      lastSuccessfulUpdateTimestamp: new Date().toISOString(),
      latencyMs: 12,
      assetsCount: 8,
      statusMessage: '🟠 DEMO / SYNTHETIC DATA: Calibrated historical price simulation for zero-risk paper trading observation.',
      lastErrorMessage: null,
      isPaperPaused: false,
    });
  }

  // 2. Alpha Vantage Live Market Data Provider
  const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
  const requestedSymbol = (req.query.symbol as string) || 'RELIANCE.BSE';

  if (!alphaVantageKey || alphaVantageKey.trim().length === 0) {
    return res.json({
      provider: 'alpha-vantage',
      providerName: 'Alpha Vantage Equities API (NSE/BSE)',
      providerType: 'ALPHA_VANTAGE',
      isConfigured: false,
      requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
      symbol: requestedSymbol,
      latestPrice: null,
      dataDelayMinutes: null,
      status: 'DEMO_SYNTHETIC_DATA',
      dataMode: 'SIMULATED',
      lastUpdateTimestamp: new Date().toISOString(),
      lastSuccessfulUpdateTimestamp: new Date().toISOString(),
      latencyMs: 12,
      assetsCount: 8,
      statusMessage: 'DEMO DATA MODE — LIVE DATA NOT CONNECTED',
      lastErrorMessage: 'Alpha Vantage API key is not configured. Running with deterministic demo data fallback.',
      isPaperPaused: false,
    });
  }

  // Return cached response if checked recently (< 15 seconds normally, 120s if in rate limit state)
  const now = Date.now();
  const cacheTTL = alphaVantageCache?.statusData?.pauseReason?.includes('rate limit') || alphaVantageCache?.statusData?.pauseReason?.includes('notice')
    ? 120000 
    : 15000;
  if (!forceCheck && alphaVantageCache && now - alphaVantageCache.timestamp < cacheTTL) {
    return res.json(alphaVantageCache.statusData);
  }

  // Perform actual authenticated HTTP probe to Alpha Vantage
  const testSymbol = requestedSymbol;
  const probeUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(testSymbol)}&apikey=${encodeURIComponent(alphaVantageKey.trim())}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const probeStartTime = Date.now();

  try {
    const response = await fetch(probeUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    const measuredLatency = Date.now() - probeStartTime;

    if (!response.ok) {
      const errorResult = {
        provider: 'alpha-vantage',
        providerName: 'Alpha Vantage Equities API (NSE/BSE)',
        providerType: 'ALPHA_VANTAGE',
        isConfigured: false,
        requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
        symbol: testSymbol,
        latestPrice: null,
        dataDelayMinutes: null,
        status: 'DATA_FEED_OFFLINE',
        dataMode: 'OFFLINE',
        lastUpdateTimestamp: new Date().toISOString(),
        lastSuccessfulUpdateTimestamp: null,
        latencyMs: null,
        assetsCount: 0,
        statusMessage: `🔴 DATA FEED OFFLINE — PROVIDER SERVER ERROR (HTTP ${response.status})`,
        lastErrorMessage: `Alpha Vantage endpoint returned HTTP ${response.status}: ${response.statusText}`,
        isPaperPaused: true,
        pauseReason: `HTTP ${response.status} from provider`,
      };
      alphaVantageCache = { timestamp: now, statusData: errorResult };
      return res.json(errorResult);
    }

    const json: any = await response.json();

    // Check for invalid API key response
    if (json['Error Message']) {
      const keyErrorResult = {
        provider: 'alpha-vantage',
        providerName: 'Alpha Vantage Equities API (NSE/BSE)',
        providerType: 'ALPHA_VANTAGE',
        isConfigured: false,
        requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
        symbol: testSymbol,
        latestPrice: null,
        dataDelayMinutes: null,
        status: 'DATA_FEED_OFFLINE',
        dataMode: 'OFFLINE',
        lastUpdateTimestamp: new Date().toISOString(),
        lastSuccessfulUpdateTimestamp: null,
        latencyMs: null,
        assetsCount: 0,
        statusMessage: '🔴 DATA FEED OFFLINE — INVALID API KEY',
        lastErrorMessage: sanitizeMessage(`Authentication failed: ${json['Error Message']}`),
        isPaperPaused: true,
        pauseReason: 'Invalid Alpha Vantage API key credentials',
      };
      alphaVantageCache = { timestamp: now, statusData: keyErrorResult };
      return res.json(keyErrorResult);
    }

    // Check for rate limit note
    if (json['Note']) {
      const rateLimitResult = {
        provider: 'alpha-vantage',
        providerName: 'Alpha Vantage Equities API (NSE/BSE)',
        providerType: 'ALPHA_VANTAGE',
        isConfigured: false,
        requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
        symbol: testSymbol,
        latestPrice: null,
        dataDelayMinutes: null,
        status: 'DATA_FEED_OFFLINE',
        dataMode: 'OFFLINE',
        lastUpdateTimestamp: new Date().toISOString(),
        lastSuccessfulUpdateTimestamp: null,
        latencyMs: null,
        assetsCount: 0,
        statusMessage: '🔴 DATA FEED OFFLINE — API RATE LIMIT EXCEEDED',
        lastErrorMessage: sanitizeMessage(`Rate limit notice: ${json['Note']}`),
        isPaperPaused: true,
        pauseReason: 'Alpha Vantage rate limit reached',
      };
      alphaVantageCache = { timestamp: now, statusData: rateLimitResult };
      return res.json(rateLimitResult);
    }

    // Check for access tier notice / information
    if (json['Information']) {
      const infoMsg = String(json['Information']);
      const isRateLimitNotice = infoMsg.includes('rate limit') || infoMsg.includes('25 requests') || infoMsg.includes('per day') || infoMsg.includes('sparingly');
      const infoResult = {
        provider: 'alpha-vantage',
        providerName: 'Alpha Vantage Equities API (NSE/BSE)',
        providerType: 'ALPHA_VANTAGE',
        isConfigured: false,
        requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
        symbol: testSymbol,
        latestPrice: null,
        dataDelayMinutes: null,
        status: 'DATA_FEED_OFFLINE',
        dataMode: 'OFFLINE',
        lastUpdateTimestamp: new Date().toISOString(),
        lastSuccessfulUpdateTimestamp: null,
        latencyMs: null,
        assetsCount: 0,
        statusMessage: isRateLimitNotice
          ? '🔴 DATA FEED OFFLINE — API RATE LIMIT EXCEEDED (25 req/day limit)'
          : '🔴 DATA FEED OFFLINE — PROVIDER NOTICE',
        lastErrorMessage: sanitizeMessage(`Notice: ${json['Information']}`),
        isPaperPaused: true,
        pauseReason: isRateLimitNotice
          ? 'Alpha Vantage standard free-tier rate limit (25 req/day) reached on key'
          : 'Alpha Vantage access notice',
      };
      alphaVantageCache = { timestamp: now, statusData: infoResult };
      return res.json(infoResult);
    }

    // Check for empty quote or unrecognized symbol
    const rawQuote = json['Global Quote'] || json['Realtime Global Quote'];
    if (rawQuote && Object.keys(rawQuote).length === 0) {
      const noDataResult = {
        provider: 'alpha-vantage',
        providerName: 'Alpha Vantage Equities API (NSE/BSE)',
        providerType: 'ALPHA_VANTAGE',
        isConfigured: false,
        requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
        symbol: testSymbol,
        latestPrice: null,
        dataDelayMinutes: null,
        status: 'DATA_FEED_OFFLINE',
        dataMode: 'OFFLINE',
        lastUpdateTimestamp: new Date().toISOString(),
        lastSuccessfulUpdateTimestamp: null,
        latencyMs: null,
        assetsCount: 0,
        statusMessage: `🔴 DATA FEED OFFLINE — UNSUPPORTED SYMBOL (${testSymbol})`,
        lastErrorMessage: `Alpha Vantage returned empty quote for symbol '${testSymbol}'. Ensure symbol is formatted correctly (e.g. RELIANCE.BSE or US symbol like IBM).`,
        isPaperPaused: true,
        pauseReason: `Unsupported symbol or no market data for ${testSymbol}`,
      };
      alphaVantageCache = { timestamp: now, statusData: noDataResult };
      return res.json(noDataResult);
    }

    // Validate Global Quote structure
    const quote = rawQuote;
    if (!quote || Object.keys(quote).length === 0 || !quote['05. price']) {
      const malformedResult = {
        provider: 'alpha-vantage',
        providerName: 'Alpha Vantage Equities API (NSE/BSE)',
        providerType: 'ALPHA_VANTAGE',
        isConfigured: false,
        requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
        symbol: testSymbol,
        latestPrice: null,
        dataDelayMinutes: null,
        status: 'DATA_FEED_OFFLINE',
        dataMode: 'OFFLINE',
        lastUpdateTimestamp: new Date().toISOString(),
        lastSuccessfulUpdateTimestamp: null,
        latencyMs: null,
        assetsCount: 0,
        statusMessage: '🔴 DATA FEED OFFLINE — MALFORMED PROVIDER RESPONSE',
        lastErrorMessage: 'Provider response payload missing expected quote fields.',
        isPaperPaused: true,
        pauseReason: 'Malformed provider response',
      };
      alphaVantageCache = { timestamp: now, statusData: malformedResult };
      return res.json(malformedResult);
    }

    // Check for stale data if trading day is far in the past (> 7 days)
    const tradingDay = quote['07. latest trading day'];
    let isStale = false;
    if (tradingDay) {
      const dayTime = new Date(tradingDay).getTime();
      if (!isNaN(dayTime) && Date.now() - dayTime > 7 * 24 * 60 * 60 * 1000) {
        isStale = true;
      }
    }

    const parsedPrice = parseFloat(quote['05. price']);
    const isDelayed = Boolean(tradingDay && !tradingDay.includes(':'));
    const finalStatus = isStale
      ? 'DATA_FEED_OFFLINE'
      : isDelayed
      ? 'DELAYED_MARKET_DATA'
      : 'LIVE_MARKET_DATA';
    const finalDataMode = isStale ? 'OFFLINE' : isDelayed ? 'DELAYED' : 'LIVE';

    const successResult = {
      provider: 'alpha-vantage',
      providerName: 'Alpha Vantage Equities API (NSE/BSE)',
      providerType: 'ALPHA_VANTAGE',
      isConfigured: !isStale,
      requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
      symbol: testSymbol,
      latestPrice: !isNaN(parsedPrice) ? parsedPrice : null,
      dataDelayMinutes: isDelayed ? 15 : 0,
      status: finalStatus,
      dataMode: finalDataMode,
      lastUpdateTimestamp: new Date().toISOString(),
      lastSuccessfulUpdateTimestamp: isStale ? null : new Date().toISOString(),
      latencyMs: isStale ? null : measuredLatency,
      assetsCount: isStale ? 0 : 8,
      statusMessage: isStale
        ? '🔴 DATA FEED OFFLINE — STALE MARKET DATA RECEIVED'
        : isDelayed
        ? '🟡 DELAYED MARKET DATA (15m delay) — Authenticated Feed Active'
        : '🟢 LIVE MARKET DATA — Authenticated Real-Time Feed Active',
      lastErrorMessage: isStale ? `Stale quote date received: ${tradingDay}` : null,
      isPaperPaused: isStale,
      pauseReason: isStale ? 'Stale quote date received' : undefined,
    };

    alphaVantageCache = { timestamp: now, statusData: successResult };
    return res.json(successResult);
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
    const networkErrorResult = {
      provider: 'alpha-vantage',
      providerName: 'Alpha Vantage Equities API (NSE/BSE)',
      providerType: 'ALPHA_VANTAGE',
      isConfigured: false,
      requiredEnvVar: 'ALPHA_VANTAGE_API_KEY',
      symbol: testSymbol,
      latestPrice: null,
      dataDelayMinutes: null,
      status: 'DATA_FEED_OFFLINE',
      dataMode: 'OFFLINE',
      lastUpdateTimestamp: new Date().toISOString(),
      lastSuccessfulUpdateTimestamp: null,
      latencyMs: null,
      assetsCount: 0,
      statusMessage: isTimeout
        ? '🔴 DATA FEED OFFLINE — NETWORK TIMEOUT'
        : '🔴 DATA FEED OFFLINE — PROVIDER UNAVAILABLE',
      lastErrorMessage: isTimeout
        ? 'Network timeout (>5000ms) attempting to connect to Alpha Vantage.'
        : (err?.message || 'Connection failed to Alpha Vantage server.'),
      isPaperPaused: true,
      pauseReason: isTimeout ? 'Network timeout' : 'Server unavailable',
    };
    alphaVantageCache = { timestamp: now, statusData: networkErrorResult };
    return res.json(networkErrorResult);
  }
});

app.get('/api/market/stocks', (_req, res) => {
  res.json(MOCK_STOCKS);
});

app.get('/api/market/stock/:symbol', (req, res) => {
  const symbol = req.params.symbol;
  const stock = getStockBySymbol(symbol);
  res.json(stock);
});

// Real-quotes proxy for Alpha Vantage / multi-symbol fetching
app.post('/api/market/real-quotes', async (req, res) => {
  const symbols = req.body.symbols || [];
  const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!alphaVantageKey || !alphaVantageKey.trim()) {
    return res.status(503).json({
      error: 'PROVIDER_OFFLINE',
      message: 'ALPHA_VANTAGE_API_KEY is not configured in the server environment.',
      quotes: [],
    });
  }

  const quotes: any[] = [];
  for (const sym of symbols.slice(0, 3)) { // Free tier safety: max 3 symbols
    try {
      const querySym = sym.includes('.') ? sym : `${sym}.BSE`;
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(querySym)}&apikey=${encodeURIComponent(alphaVantageKey.trim())}`;
      const response = await fetch(url);
      const json: any = await response.json();

      if (json['Global Quote'] && json['Global Quote']['05. price']) {
        const gq = json['Global Quote'];
        quotes.push({
          symbol: sym,
          name: sym,
          price: parseFloat(gq['05. price']),
          change: parseFloat(gq['09. change'] || '0'),
          changePercent: parseFloat((gq['10. change percent'] || '0').replace('%', '')),
          open: parseFloat(gq['02. open']),
          high: parseFloat(gq['03. high']),
          low: parseFloat(gq['04. low']),
          previousClose: parseFloat(gq['08. previous close']),
          volume: parseInt(gq['06. volume'] || '0'),
          lastUpdated: gq['07. latest trading day'],
        });
      }
    } catch {
      // Continue
    }
  }

  if (quotes.length > 0) {
    return res.json(quotes);
  }

  return res.status(503).json({
    error: 'NO_LIVE_QUOTES',
    message: 'No live quotes available from Alpha Vantage (rate limited or offline).',
    quotes: [],
  });
});

// Real historical candle series proxy for Alpha Vantage
app.get('/api/market/real-history/:symbol', async (req, res) => {
  const sym = req.params.symbol;
  const days = parseInt(req.query.days as string) || 250;
  const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!alphaVantageKey || !alphaVantageKey.trim()) {
    return res.status(503).json({
      error: 'PROVIDER_OFFLINE',
      message: 'ALPHA_VANTAGE_API_KEY is not configured in the server environment.',
    });
  }

  try {
    const querySym = sym.includes('.') ? sym : `${sym}.BSE`;
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(querySym)}&apikey=${encodeURIComponent(alphaVantageKey.trim())}`;
    const response = await fetch(url);
    const json: any = await response.json();

    const timeSeries = json['Time Series (Daily)'];
    if (timeSeries && typeof timeSeries === 'object') {
      const candles: any[] = [];
      const dateKeys = Object.keys(timeSeries).sort(); // Ascending

      for (const d of dateKeys.slice(-days)) {
        const bar = timeSeries[d];
        const open = parseFloat(bar['1. open']);
        const high = parseFloat(bar['2. high']);
        const low = parseFloat(bar['3. low']);
        const close = parseFloat(bar['4. close']);
        const volume = parseInt(bar['5. volume'] || '0');

        if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && open > 0) {
          candles.push({
            date: d,
            timestamp: d,
            open,
            high,
            low,
            close,
            volume,
          });
        }
      }

      if (candles.length > 0) {
        return res.json(candles);
      }
    }

    return res.status(503).json({
      error: 'RATE_LIMIT_OR_UNAVAILABLE',
      message: sanitizeMessage(json['Information'] || json['Note'] || json['Error Message'] || 'Alpha Vantage time series unavailable.'),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'NETWORK_ERROR',
      message: err?.message || 'Failed to fetch historical series from provider.',
    });
  }
});

app.get('/api/market/poll-candle/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;

  // If Alpha Vantage key is available, attempt a real quote poll
  if (alphaVantageKey && alphaVantageKey.trim()) {
    try {
      const querySym = symbol.includes('.') ? symbol : `${symbol}.BSE`;
      const start = Date.now();
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(querySym)}&apikey=${encodeURIComponent(alphaVantageKey.trim())}`;
      const response = await fetch(url);
      const latencyMs = Date.now() - start;
      const json: any = await response.json();

      const quote = json['Global Quote'] || json['Realtime Global Quote'];
      if (quote && quote['05. price']) {
        const open = parseFloat(quote['02. open'] || quote['05. price']);
        const high = parseFloat(quote['03. high'] || quote['05. price']);
        const low = parseFloat(quote['04. low'] || quote['05. price']);
        const close = parseFloat(quote['05. price']);
        const volume = parseInt(quote['06. volume'] || '100000');
        const tradingDay = quote['07. latest trading day'] || new Date().toISOString().split('T')[0];

        if (!isNaN(close) && close > 0) {
          return res.json({
            symbol,
            timestamp: tradingDay,
            open,
            high,
            low,
            close,
            volume,
            isFinalBar: true,
            feedLatencyMs: latencyMs,
            isLiveAlphaVantage: true,
          });
        }
      }
    } catch {
      // Fall back to offline response
    }
  }

  const stock = getStockBySymbol(symbol);
  if (!stock || !stock.history || stock.history.length === 0) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  const latest = stock.history[stock.history.length - 1];
  res.json({
    symbol: stock.symbol,
    timestamp: latest.date || latest.timestamp,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
    volume: latest.volume,
    isFinalBar: true,
    feedLatencyMs: 14,
    isLiveAlphaVantage: false,
  });
});

// 3. Gemini Technical Analysis endpoint
app.post('/api/gemini/analyze', async (req, res) => {
  const stockData = req.body;

  if (!stockData || !stockData.symbol) {
    return res.status(400).json({ error: 'Missing stock data for analysis.' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.json(
      getDeterministicStockFallback(stockData, 'Gemini API key not configured. Showing deterministic demo analysis.')
    );
  }

  if (checkQuotaState()) {
    return res.json(
      getDeterministicStockFallback(stockData, 'Gemini API quota temporarily unavailable. Showing deterministic demo analysis.')
    );
  }

  try {
    const prompt = `Analyze the following stock market asset using technical indicators provided.
Stock Symbol: ${stockData.symbol} (${stockData.name})
Current Price: ${stockData.price}
24h % Change: ${stockData.changePercent}%
RSI (14): ${stockData.rsi14}
MACD Line: ${stockData.macdLine}, Signal: ${stockData.macdSignal}
SMA 20: ${stockData.sma20}, SMA 50: ${stockData.sma50}
Estimated Support: ${stockData.support}, Resistance: ${stockData.resistance}
Trading Volume: ${stockData.volume}

You are analyzing supplied technical data. Do not invent prices, indicators, volume, news, or market information that is not present in the supplied input.
Provide a structured, rigorous technical analysis based ONLY on the supplied quantitative metrics. Do NOT claim certainty or guarantee returns.`;

    const response = await callGeminiWithProtection(() =>
      ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert quantitative technical analyst for TradeAI by PMK. Your output must strictly adhere to the JSON schema provided. Analyze RSI, moving averages, MACD, support/resistance, and risk/reward. Do not invent unsupplied data.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              marketTrend: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
              aiSignal: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
              confidence: { type: Type.NUMBER, description: 'Percentage 0 to 100' },
              riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
              suggestedEntryZone: { type: Type.STRING },
              suggestedStopLoss: { type: Type.STRING },
              suggestedTakeProfit: { type: Type.STRING },
              riskRewardRatio: { type: Type.STRING },
              reasoning: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 concise data-backed bullet points',
              },
            },
            required: [
              'symbol',
              'marketTrend',
              'aiSignal',
              'confidence',
              'riskLevel',
              'suggestedEntryZone',
              'suggestedStopLoss',
              'suggestedTakeProfit',
              'riskRewardRatio',
              'reasoning',
            ],
          },
        },
      })
    );

    if (response && response.text) {
      const resultJson = JSON.parse(response.text.trim());
      if (resultJson && resultJson.aiSignal) {
        resultJson.disclaimer = 'AI analysis is informational and educational. It is not financial advice.';
        resultJson.analyzedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        resultJson.isFallback = false;
        resultJson.provider = 'Gemini 3.6 Flash';
        return res.json(resultJson);
      }
    }
    throw new Error('Invalid JSON format from Gemini model');
  } catch (err: any) {
    const msg = err?.message || '';
    let userNotice = 'AI service temporarily unavailable. Using deterministic demo analysis.';
    if (msg.includes('429') || msg.includes('QUOTA')) {
      userNotice = 'Gemini API quota temporarily unavailable. Showing deterministic demo analysis.';
    }
    return res.json(getDeterministicStockFallback(stockData, userNotice));
  }
});

// 4. Gemini Market Summary endpoint
app.post('/api/gemini/market-summary', async (req, res) => {
  const stocks = req.body.stocks || [];

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return res.json(
      getDeterministicMarketSummaryFallback([], 'Insufficient market data provided for analysis.')
    );
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.json(
      getDeterministicMarketSummaryFallback(stocks, 'Gemini API key not configured. Showing deterministic demo market summary.')
    );
  }

  if (checkQuotaState()) {
    return res.json(
      getDeterministicMarketSummaryFallback(stocks, 'Gemini API quota temporarily unavailable. Showing deterministic demo market summary.')
    );
  }

  try {
    const prompt = `Synthesize an educational executive market summary for the following equities portfolio/market dataset:
${JSON.stringify(stocks, null, 2)}

You are analyzing supplied technical data. Do not invent prices, indicators, volume, news, or market information that is not present in the supplied input.
Provide overall sentiment, sector strength, key observations, and risk considerations.`;

    const response = await callGeminiWithProtection(() =>
      ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a senior market strategist for TradeAI by PMK. Output concise JSON adhering to the specified schema. Never invent unsupplied market data.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSentiment: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
              sentimentScore: { type: Type.NUMBER, description: '0 to 100 score' },
              strongestSectors: { type: Type.ARRAY, items: { type: Type.STRING } },
              weakestSectors: { type: Type.ARRAY, items: { type: Type.STRING } },
              keyObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskConsiderations: { type: Type.ARRAY, items: { type: Type.STRING } },
              summaryParagraph: { type: Type.STRING },
            },
            required: [
              'overallSentiment',
              'sentimentScore',
              'strongestSectors',
              'weakestSectors',
              'keyObservations',
              'riskConsiderations',
              'summaryParagraph',
            ],
          },
        },
      })
    );

    if (response && response.text) {
      const resultJson = JSON.parse(response.text.trim());
      if (resultJson && resultJson.overallSentiment) {
        resultJson.generatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        resultJson.isFallback = false;
        resultJson.provider = 'Gemini 3.6 Flash';
        return res.json(resultJson);
      }
    }
    throw new Error('Invalid JSON format from Gemini model');
  } catch (err: any) {
    const msg = err?.message || '';
    let userNotice = 'AI service temporarily unavailable. Using deterministic demo market summary.';
    if (msg.includes('429') || msg.includes('QUOTA')) {
      userNotice = 'Gemini API quota temporarily unavailable. Showing deterministic demo market summary.';
    }
    return res.json(getDeterministicMarketSummaryFallback(stocks, userNotice));
  }
});

export default app;
