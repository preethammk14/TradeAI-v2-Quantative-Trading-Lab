import React from 'react';
import { BookOpen, Code2, LineChart, Cpu, Calculator, Info } from 'lucide-react';
import { DemoDataBadge } from '../components/DemoDataBadge';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <DemoDataBadge />

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-emerald-400" />
          <span>Technical Indicator & Quantitative Methodology</span>
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Detailed mathematical formulation and AI integration specs powering TradeAI by PMK
        </p>
      </div>

      {/* Grid of Indicator Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RSI Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Calculator className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Relative Strength Index (RSI - 14)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Measures the magnitude of recent price changes to evaluate overbought or oversold conditions in price momentum.
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 space-y-1">
            <div>RS = Avg Gain (14) / Avg Loss (14)</div>
            <div>RSI = 100 - (100 / (1 + RS))</div>
          </div>

          <ul className="text-xs text-slate-400 space-y-1">
            <li>• <strong className="text-rose-400">RSI &ge; 70:</strong> Overbought condition (potential pullback)</li>
            <li>• <strong className="text-emerald-400">RSI &le; 30:</strong> Oversold condition (potential rebound)</li>
            <li>• <strong className="text-slate-300">RSI = 50:</strong> Neutral equilibrium</li>
          </ul>
        </div>

        {/* MACD Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <LineChart className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Moving Average Convergence Divergence (MACD)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Trend-following momentum indicator showing the relationship between two exponential moving averages.
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-400 space-y-1">
            <div>MACD Line = EMA(12) - EMA(26)</div>
            <div>Signal Line = EMA(9) of MACD Line</div>
            <div>Histogram = MACD Line - Signal Line</div>
          </div>

          <ul className="text-xs text-slate-400 space-y-1">
            <li>• <strong className="text-emerald-400">Bullish Crossover:</strong> MACD line crosses above Signal line</li>
            <li>• <strong className="text-rose-400">Bearish Crossover:</strong> MACD line crosses below Signal line</li>
          </ul>
        </div>

        {/* Moving Averages Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Code2 className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Simple Moving Averages (20 / 50 SMA)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Smoothes price fluctuations to filter noise and reveal core directional trends over rolling time periods.
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-teal-400">
            SMA(N) = (&sum; Close Prices over N periods) / N
          </div>

          <ul className="text-xs text-slate-400 space-y-1">
            <li>• <strong className="text-amber-400">Golden Cross:</strong> 20 SMA crosses above 50 SMA (Bullish)</li>
            <li>• <strong className="text-rose-400">Death Cross:</strong> 20 SMA crosses below 50 SMA (Bearish)</li>
          </ul>
        </div>

        {/* Gemini AI Synthesis Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Gemini 3.6 Flash Multi-Factor Synthesis</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Synthesizes numeric indicator signals into structured JSON reasoning objects with explicit confidence scoring.
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300">
            JSON Schema: &#123; aiSignal, marketTrend, confidence, reasoning[], riskLevel &#125;
          </div>

          <p className="text-xs text-slate-400">
            Combines quantitative technical factors with risk management filters to eliminate false breakout signals.
          </p>
        </div>
      </div>
    </div>
  );
};
