import React from 'react';
import { ShieldAlert, AlertCircle, Info } from 'lucide-react';

interface PaperTradingNoticeProps {
  compact?: boolean;
  className?: string;
}

export const PaperTradingNotice: React.FC<PaperTradingNoticeProps> = ({
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs ${className}`}
      >
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong className="font-bold text-amber-400 uppercase tracking-wide mr-1">
            PAPER TRADING ONLY:
          </strong>
          Simulated quantitative research environment. Historical metrics and walk-forward results do not guarantee future returns.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden group ${className}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-400 uppercase tracking-wider text-xs">
              MANDATORY RESEARCH DISCLAIMER: PAPER TRADING ONLY
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              SIMULATED LAB
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            TradeAI v2 — Research Lab is an educational and quantitative testing platform. All backtests, walk-forward validations, benchmark evaluations, and paper trading executions are simulated. Historical performance, backtest equity curves, and statistical expectancies do not guarantee future live market results or eliminate real-world capital risk.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-400">
            <span>• No actual capital deployed</span>
            <span>• Zero execution brokerage liability</span>
            <span>• Not financial advice or trade recommendation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
