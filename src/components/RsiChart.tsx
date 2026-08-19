import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { PricePoint } from '../types';
import { calculateRSI } from '../services/technicalAnalysisService';

interface RsiChartProps {
  history: PricePoint[];
}

export const RsiChart: React.FC<RsiChartProps> = ({ history }) => {
  const closePrices = history.map((h) => h.close);
  const rsiValues = calculateRSI(closePrices, 14);

  const data = history.map((pt, idx) => ({
    date: pt.date.slice(5),
    rsi: rsiValues[idx],
  }));

  const latestRsi = rsiValues[rsiValues.length - 1] || 50;
  const isOverbought = latestRsi >= 70;
  const isOversold = latestRsi <= 30;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>RSI (14) Indicator</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                isOverbought
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : isOversold
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {isOverbought ? 'OVERBOUGHT (>70)' : isOversold ? 'OVERSOLD (<30)' : 'NEUTRAL ZONE'}
            </span>
          </h4>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 mr-2">Current Value:</span>
          <span className="text-base font-bold text-white">{latestRsi.toFixed(1)}</span>
        </div>
      </div>

      <div className="h-[140px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[30, 50, 70]} stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs font-medium text-slate-200 shadow-lg">
                      {d.date} — RSI: <span className="font-bold text-emerald-400">{d.rsi}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#475569" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
