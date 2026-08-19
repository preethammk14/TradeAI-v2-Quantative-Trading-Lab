import React, { useState } from 'react';
import { ShieldAlert, Calculator, DollarSign, AlertCircle, Percent, Sliders } from 'lucide-react';
import { PortfolioSummary, PaperTrade } from '../types';
import { DemoDataBadge } from '../components/DemoDataBadge';

interface RiskPageProps {
  portfolioSummary: PortfolioSummary;
  openTrades: PaperTrade[];
  currencySymbol: string;
}

export const RiskPage: React.FC<RiskPageProps> = ({
  portfolioSummary,
  openTrades,
  currencySymbol,
}) => {
  // Calculator state
  const [accountCapital, setAccountCapital] = useState<number>(portfolioSummary.totalValue);
  const [riskPercentage, setRiskPercentage] = useState<number>(1.5);
  const [entryPrice, setEntryPrice] = useState<number>(150);
  const [stopLossPrice, setStopLossPrice] = useState<number>(142);

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculations
  const totalAmountToRisk = accountCapital * (riskPercentage / 100);
  const riskPerShare = Math.abs(entryPrice - stopLossPrice);
  const calculatedShares = riskPerShare > 0 ? Math.floor(totalAmountToRisk / riskPerShare) : 0;
  const totalPositionCost = calculatedShares * entryPrice;
  const portfolioExposurePercent =
    accountCapital > 0 ? Number(((totalPositionCost / accountCapital) * 100).toFixed(1)) : 0;

  // Portfolio level VaR estimation
  const totalInvested = portfolioSummary.investedAmount;
  const estimatedDailyVaR = totalInvested * 0.021; // 2.1% parametric VaR at 95% confidence

  return (
    <div className="space-y-6">
      <DemoDataBadge />

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <span>Quantitative Risk Management & Position Sizing</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional capital preservation rules, maximum drawdown limiters, and 1% risk allocation modeling
          </p>
        </div>
      </div>

      {/* Grid: Position Sizing Calculator (1 col) + Risk Exposure Dashboard (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Position Size & Risk Calculator</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Account Portfolio Capital ({currencySymbol}):</label>
              <input
                type="number"
                value={accountCapital}
                onChange={(e) => setAccountCapital(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Risk Allocation Per Trade (%):</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-bold rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Entry Price ({currencySymbol}):</label>
                <input
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Stop Loss ({currencySymbol}):</label>
                <input
                  type="number"
                  step="0.01"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-rose-400 font-bold rounded-xl p-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Results Output */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 mt-4">
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Money At Risk:</span>
                <strong className="text-rose-400 font-bold">{formatCurrency(totalAmountToRisk)}</strong>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Risk Per Share:</span>
                <strong className="text-slate-200">{formatCurrency(riskPerShare)}</strong>
              </div>

              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                <span>Recommended Max Shares:</span>
                <strong className="text-2xl font-black text-emerald-400">{calculatedShares}</strong>
              </div>

              <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1">
                <span>Total Position Value:</span>
                <span className="text-white font-semibold">{formatCurrency(totalPositionCost)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Portfolio Exposure:</span>
                <span
                  className={`font-bold ${
                    portfolioExposurePercent > 30 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {portfolioExposurePercent}% of total portfolio
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Risk Exposure Dashboard (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Estimated Daily 95% VaR</span>
              <div className="text-xl font-black text-rose-400">{formatCurrency(estimatedDailyVaR)}</div>
              <p className="text-[10px] text-slate-500">Maximum expected loss over 24h at 95% confidence</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Current Exposure Ratio</span>
              <div className="text-xl font-black text-amber-400">
                {((portfolioSummary.investedAmount / portfolioSummary.totalValue) * 100).toFixed(1)}%
              </div>
              <p className="text-[10px] text-slate-500">Capital actively committed to open positions</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Max Drawdown Ceiling</span>
              <div className="text-xl font-black text-emerald-400">10.0%</div>
              <p className="text-[10px] text-slate-500">Recommended hard limit before strategy pause</p>
            </div>
          </div>

          {/* Golden Rules of Capital Preservation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Core Risk Management Principles</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400">1. The 1% - 2% Account Rule</span>
                <p className="text-slate-400">
                  Never risk more than 1% to 2% of your total account capital on a single trade setup to ensure long-term survivability.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400">2. Mandatory Stop Losses</span>
                <p className="text-slate-400">
                  Always place invalidation stop-loss levels based on key technical structure rather than emotional thresholds.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400">3. Asymmetric Risk/Reward Ratio</span>
                <p className="text-slate-400">
                  Aim for setups offering at least a 1:2 or 1:3 Risk to Reward ratio to maintain positive expectancy even with a 40% win rate.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400">4. Sector Diversification</span>
                <p className="text-slate-400">
                  Avoid concentrating more than 30% of total equity into a single market sector to minimize systemic correlation risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
