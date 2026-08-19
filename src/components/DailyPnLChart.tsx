import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Calendar, DollarSign, Activity } from 'lucide-react';

export interface DailyPnLPoint {
  date: string; // YYYY-MM-DD
  realizedPnL: number;
  tradesCount: number;
  grossPnL: number;
  totalFees: number;
  cumulativePnL: number;
}

interface DailyPnLChartProps {
  data: DailyPnLPoint[];
  currencySymbol: string;
}

export const DailyPnLChart: React.FC<DailyPnLChartProps> = ({
  data,
  currencySymbol,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Daily Realized P/L Distribution (Paper Ledger)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Simulated Ledger Only
          </span>
        </div>
        <div className="py-12 text-center text-slate-400 text-xs space-y-2">
          <Activity className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-400">No closed paper trades recorded yet</p>
          <p className="text-[11px] text-slate-400">
            Daily P/L bars will render strictly from recorded virtual ledger close events.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Daily Realized P/L Distribution
            </h3>
            <p className="text-[11px] text-slate-400">
              Aggregated daily returns directly derived from closed paper trade ledger timestamps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" /> Profit Day
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm inline-block" /> Loss Day
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${currencySymbol}${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload as DailyPnLPoint;
                  const isPos = point.realizedPnL >= 0;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono">
                      <p className="text-slate-400 font-bold border-b border-slate-800 pb-1">{point.date}</p>
                      <p className={`font-black text-sm ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Net P/L: {isPos ? '+' : ''}{formatCurrency(point.realizedPnL)}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Gross P/L: {currencySymbol}{point.grossPnL.toFixed(2)}
                      </p>
                      <p className="text-amber-400 text-[11px]">
                        Fees & Slip: {currencySymbol}{point.totalFees.toFixed(2)}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Closed Trades: {point.tradesCount}
                      </p>
                      <p className="text-indigo-300 text-[11px] pt-1 border-t border-slate-800/80">
                        Cumulative: {currencySymbol}{point.cumulativePnL.toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <Bar dataKey="realizedPnL" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.realizedPnL >= 0 ? '#10b981' : '#f43f5e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
