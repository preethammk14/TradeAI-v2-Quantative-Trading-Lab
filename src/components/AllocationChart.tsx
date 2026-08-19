import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { PaperTrade } from '../types';

interface AllocationChartProps {
  openTrades: PaperTrade[];
  availableCash: number;
  currencySymbol?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const AllocationChart: React.FC<AllocationChartProps> = ({
  openTrades,
  availableCash,
  currencySymbol = '₹',
}) => {
  const allocationMap = new Map<string, number>();
  let totalInvested = 0;

  openTrades.forEach((t) => {
    const value = t.currentValue || t.totalCost;
    totalInvested += value;
    allocationMap.set(t.symbol, (allocationMap.get(t.symbol) || 0) + value);
  });

  const data = Array.from(allocationMap.entries()).map(([symbol, val]) => ({
    name: symbol,
    value: Number(val.toFixed(2)),
  }));

  data.push({
    name: 'Available Cash',
    value: Number(availableCash.toFixed(2)),
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="pb-2 border-b border-slate-800">
        <h4 className="text-sm font-bold text-slate-100">Asset Allocation Breakdown</h4>
        <p className="text-xs text-slate-400">Distribution of invested capital & virtual liquidity</p>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0];
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1 shadow-xl">
                      <div className="font-semibold text-slate-200">{d.name}</div>
                      <div className="text-emerald-400 font-bold">
                        {currencySymbol}{Number(d.value).toLocaleString()}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
