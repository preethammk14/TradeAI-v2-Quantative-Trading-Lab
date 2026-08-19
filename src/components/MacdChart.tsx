import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { PricePoint } from '../types';
import { calculateMACD } from '../services/technicalAnalysisService';

interface MacdChartProps {
  history: PricePoint[];
}

export const MacdChart: React.FC<MacdChartProps> = ({ history }) => {
  const closePrices = history.map((h) => h.close);
  const macdData = calculateMACD(closePrices, 12, 26, 9);

  const data = history.map((pt, idx) => ({
    date: pt.date.slice(5),
    macdLine: macdData.macdLine[idx],
    signalLine: macdData.signalLine[idx],
    histogram: macdData.histogram[idx],
  }));

  const latestHist = macdData.histogram[macdData.histogram.length - 1] || 0;
  const isBullishSignal = latestHist > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>MACD (12, 26, 9)</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                isBullishSignal
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
            >
              {isBullishSignal ? 'BULLISH HISTOGRAM' : 'BEARISH HISTOGRAM'}
            </span>
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="text-sky-400">MACD: {macdData.macdLine[macdData.macdLine.length - 1] || 0}</span>
          <span className="text-amber-400">Signal: {macdData.signalLine[macdData.signalLine.length - 1] || 0}</span>
        </div>
      </div>

      <div className="h-[140px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs space-y-1 text-slate-200 shadow-lg">
                      <div className="font-semibold text-slate-300">{d.date}</div>
                      <div className="text-sky-400">MACD Line: {d.macdLine}</div>
                      <div className="text-amber-400">Signal Line: {d.signalLine}</div>
                      <div className={d.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        Histogram: {d.histogram}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />

            <Bar dataKey="histogram" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.histogram >= 0 ? '#22c55e' : '#ef4444'}
                  opacity={0.85}
                />
              ))}
            </Bar>

            <Line type="monotone" dataKey="macdLine" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="signalLine" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
