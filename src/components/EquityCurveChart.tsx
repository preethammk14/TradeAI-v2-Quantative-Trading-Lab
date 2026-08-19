import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface EquityCurveChartProps {
  data: { date: string; equity: number; buyAndHold: number }[];
  currencySymbol?: string;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  data,
  currencySymbol = '₹',
}) => {
  if (!data || data.length === 0) return null;

  const minVal = Math.floor(
    Math.min(...data.map((d) => Math.min(d.equity, d.buyAndHold))) * 0.95
  );
  const maxVal = Math.ceil(
    Math.max(...data.map((d) => Math.max(d.equity, d.buyAndHold))) * 1.05
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-100">Equity Curve vs Benchmark</h4>
          <p className="text-xs text-slate-400">Strategy growth trajectory compared against Buy & Hold benchmark</p>
        </div>
      </div>

      <div className="h-[260px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="strategyEquityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis
              domain={[minVal, maxVal]}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(val) => `${currencySymbol}${(val / 1000).toFixed(0)}k`}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1.5 shadow-2xl">
                      <div className="font-semibold text-slate-300 border-b border-slate-800 pb-1">
                        {label}
                      </div>
                      <div className="text-emerald-400 font-semibold">
                        Strategy Equity: {currencySymbol}{Number(payload[0].value).toLocaleString()}
                      </div>
                      {payload[1] && (
                        <div className="text-sky-400">
                          Buy & Hold: {currencySymbol}{Number(payload[1].value).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend verticalAlign="top" height={36} />

            <Area
              name="Trading Strategy"
              type="monotone"
              dataKey="equity"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#strategyEquityGrad)"
            />
            <Area
              name="Buy & Hold Benchmark"
              type="monotone"
              dataKey="buyAndHold"
              stroke="#0284c7"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
