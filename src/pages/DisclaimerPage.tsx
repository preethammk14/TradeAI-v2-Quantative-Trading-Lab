import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';

export const DisclaimerPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Disclaimer Hero Header */}
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-rose-300">
              Regulatory & Educational Disclaimer Notice
            </h1>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Please read carefully before using TradeAI by PMK software
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-xs text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>1. Educational Purpose Only</span>
          </h2>
          <p>
            TradeAI by PMK is designed solely for <strong>educational, analytical, and research purposes</strong>. The platform does not offer investment advisory services, stock picking, or personalized wealth management recommendations under SEBI (Investment Advisers) Regulations, SEC, FINRA, or any national financial authority.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>2. No Financial Advice or Solicitations</span>
          </h2>
          <p>
            No content, AI-generated signal, technical chart indicator, or backtested strategy result produced by TradeAI by PMK constitutes an offer or solicitation to buy or sell securities, options, futures, or financial derivatives. Users are urged to consult a licensed SEBI / RIA registered financial advisor before placing real-money trades in financial markets.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>3. Synthetic Data & Paper Trading Environment</span>
          </h2>
          <p>
            All prices, stock quotes, historical data series, and order execution fill prices presented in this platform may utilize realistic synthetic price models, simulated market data feeds, or delayed quotes. Paper trading virtual liquidity ({'₹'} / $) represents zero real monetary value. Past backtest results are not indicative of future market returns.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>4. Limitation of Liability</span>
          </h2>
          <p>
            The developers, creators, and platform providers shall not be held liable for any financial losses, capital erosion, missing profits, or operational damages resulting from the reliance on AI analyst outputs, technical calculations, or strategy backtests provided by TradeAI by PMK.
          </p>
        </section>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>TradeAI by PMK Compliance Version 1.0</span>
          <span>Updated: 2026</span>
        </div>
      </div>
    </div>
  );
};
