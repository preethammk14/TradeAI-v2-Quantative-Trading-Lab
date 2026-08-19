import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from 'recharts';
import { PricePoint, Timeframe } from '../types';
import { computeAllIndicators } from '../services/technicalAnalysisService';

interface StockChartProps {
  symbol: string;
  history: PricePoint[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const StockChart: React.FC<StockChartProps> = ({
  symbol,
  history,
  timeframe,
  onTimeframeChange,
}) => {
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showEma20, setShowEma20] = useState(false);
  const [showBollinger, setShowBollinger] = useState(true);

  const indicators = computeAllIndicators(history);

  const chartData = history.map((pt, idx) => ({
    date: pt.date.slice(5),
    fullDate: pt.date,
    close: pt.close,
    open: pt.open,
    high: pt.high,
    low: pt.low,
    volume: pt.volume,
    sma20: indicators.sma20 ? indicators.sma20[idx] : undefined,
    sma50: indicators.sma50 ? indicators.sma50[idx] : undefined,
    ema20: indicators.ema20 ? indicators.ema20[idx] : undefined,
    bbUpper: indicators.bollingerBands ? indicators.bollingerBands.upper[idx] : undefined,
    bbLower: indicators.bollingerBands ? indicators.bollingerBands.lower[idx] : undefined,
    bbMiddle: indicators.bollingerBands ? indicators.bollingerBands.middle[idx] : undefined,
  }));

  const prices = history.map((h) => h.close);
  const minPrice = Math.floor(Math.min(...prices) * 0.98);
  const maxPrice = Math.ceil(Math.max(...prices) * 1.02);

  const isPositive =
    history.length > 1
      ? history[history.length - 1].close >= history[0].close
      : true;

  const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>{symbol} Price Action</span>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-400 border border-slate-700">
              Interactive Chart
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time candle prices, moving averages & Bollinger envelopes
          </p>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeframe === tf
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Indicator Toggle Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium mr-1">Technical Overlays:</span>
        <button
          onClick={() => setShowSma20(!showSma20)}
          className={`px-2.5 py-1 rounded-md border transition-all ${
            showSma20
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-medium'
              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          SMA 20
        </button>
        <button
          onClick={() => setShowSma50(!showSma50)}
          className={`px-2.5 py-1 rounded-md border transition-all ${
            showSma50
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-medium'
              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          SMA 50
        </button>
        <button
          onClick={() => setShowEma20(!showEma20)}
          className={`px-2.5 py-1 rounded-md border transition-all ${
            showEma20
              ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-medium'
              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          EMA 20
        </button>
        <button
          onClick={() => setShowBollinger(!showBollinger)}
          className={`px-2.5 py-1 rounded-md border transition-all ${
            showBollinger
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-medium'
              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          Bollinger Bands
        </button>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[380px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="bollingerBandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <YAxis
              yAxisId="price"
              domain={[minPrice, maxPrice]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(val) => `₹${val}`}
            />

            <YAxis
              yAxisId="volume"
              orientation="right"
              domain={[0, 'dataMax * 4']}
              hide={true}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 z-50 min-w-[180px]">
                      <div className="font-semibold text-slate-200 pb-1 border-b border-slate-800 flex justify-between">
                        <span>{data.fullDate}</span>
                        <span className="text-slate-400">{symbol}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
                        <div>Close: <span className="font-bold text-white">₹{data.close}</span></div>
                        <div>Open: <span className="text-slate-400">₹{data.open}</span></div>
                        <div>High: <span className="text-emerald-400">₹{data.high}</span></div>
                        <div>Low: <span className="text-rose-400">₹{data.low}</span></div>
                      </div>
                      {data.sma20 && showSma20 && (
                        <div className="text-amber-400">SMA 20: ₹{data.sma20}</div>
                      )}
                      {data.sma50 && showSma50 && (
                        <div className="text-cyan-400">SMA 50: ₹{data.sma50}</div>
                      )}
                      {data.bbUpper && showBollinger && (
                        <div className="text-indigo-300 text-[11px]">
                          BB: [₹{data.bbLower} - ₹{data.bbUpper}]
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Bollinger Band Upper/Lower Band Area */}
            {showBollinger && (
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="bbUpper"
                stroke="#818cf8"
                strokeDasharray="2 2"
                strokeWidth={1}
                fill="url(#bollingerBandGradient)"
                isAnimationActive={false}
              />
            )}

            {/* Price Line/Area */}
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={2.5}
              fill="url(#priceGradient)"
              dot={false}
            />

            {/* Moving Averages */}
            {showSma20 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma20"
                stroke="#f59e0b"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {showSma50 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma50"
                stroke="#06b6d4"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {showEma20 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ema20"
                stroke="#a855f7"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Trading Volume Bars */}
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#334155"
              opacity={0.4}
              radius={[2, 2, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
