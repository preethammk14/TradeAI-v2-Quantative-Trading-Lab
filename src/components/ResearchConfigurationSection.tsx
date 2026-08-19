import React, { useState } from 'react';
import {
  Database,
  Calendar,
  Layers,
  Coins,
  Receipt,
  Percent,
  TrendingDown,
  Scale,
  Clock,
  Split,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Copy,
  Check,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ResearchConfig, ResultScopeTag } from '../types/researchTypes';
import { SCOPE_REGISTRY } from '../services/metricConsistencyService';

interface ResearchConfigurationSectionProps {
  config: ResearchConfig;
  defaultExpanded?: boolean;
  title?: string;
  subtitle?: string;
  allowToggle?: boolean;
  className?: string;
}

export const ResearchConfigurationSection: React.FC<ResearchConfigurationSectionProps> = ({
  config,
  defaultExpanded = true,
  title = 'Research Configuration & Audit Specification',
  subtitle = 'Exact mathematical parameters, time-series windows, dataset boundaries, and friction models applied to this result',
  allowToggle = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const scopeMeta = SCOPE_REGISTRY[config.scope] || SCOPE_REGISTRY.BACKTEST;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const configItems = [
    {
      id: 'dataset',
      label: '1. Dataset',
      value: config.datasetName,
      icon: <Database className="w-4 h-4 text-emerald-400" />,
      tag: 'Source Feed',
    },
    {
      id: 'date-range',
      label: '2. Date Range',
      value: `${config.dateRange.start} → ${config.dateRange.end}`,
      icon: <Calendar className="w-4 h-4 text-sky-400" />,
      tag: 'Time Horizon',
    },
    {
      id: 'candles',
      label: '3. Number of Candles',
      value: String(config.numberOfCandles),
      icon: <Layers className="w-4 h-4 text-teal-400" />,
      tag: 'Sample Volume',
    },
    {
      id: 'assets',
      label: '4. Assets',
      value: Array.isArray(config.assets) ? config.assets.join(', ') : String(config.assets),
      icon: <Coins className="w-4 h-4 text-amber-400" />,
      tag: `${config.assets.length} Assets`,
    },
    {
      id: 'timeframe',
      label: '5. Timeframe',
      value: config.timeframe,
      icon: <Clock className="w-4 h-4 text-indigo-400" />,
      tag: 'Resolution',
    },
    {
      id: 'initial-capital',
      label: '6. Initial Capital',
      value: typeof config.initialCapital === 'number'
        ? `₹${config.initialCapital.toLocaleString('en-IN')}`
        : String(config.initialCapital),
      icon: <Coins className="w-4 h-4 text-emerald-400" />,
      tag: 'Portfolio Base',
    },
    {
      id: 'brokerage',
      label: '7. Brokerage',
      value: String(config.brokerage),
      icon: <Receipt className="w-4 h-4 text-rose-400" />,
      tag: 'Per Order',
    },
    {
      id: 'taxes',
      label: '8. Taxes & Regulatory',
      value: String(config.taxes),
      icon: <Percent className="w-4 h-4 text-amber-400" />,
      tag: 'Statutory',
    },
    {
      id: 'slippage',
      label: '9. Slippage',
      value: String(config.slippage),
      icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
      tag: 'Adverse Fill',
    },
    {
      id: 'position-sizing',
      label: '10. Position Sizing',
      value: config.positionSizing,
      icon: <Scale className="w-4 h-4 text-sky-400" />,
      tag: 'Risk Model',
    },
    {
      id: 'warmup',
      label: '11. Indicator Warm-Up Period',
      value: String(config.indicatorWarmUpPeriod),
      icon: <Clock className="w-4 h-4 text-teal-400" />,
      tag: 'Zero Look-Ahead Buffer',
    },
    {
      id: 'train-window',
      label: '12. Training Window',
      value: String(config.trainingWindow),
      icon: <Split className="w-4 h-4 text-indigo-400" />,
      tag: 'In-Sample',
    },
    {
      id: 'val-window',
      label: '13. Validation Window',
      value: String(config.validationWindow),
      icon: <Split className="w-4 h-4 text-sky-400" />,
      tag: 'Tuning / Step',
    },
    {
      id: 'oos-window',
      label: '14. Out-of-Sample Window',
      value: String(config.outOfSampleWindow),
      icon: <FileCheck className="w-4 h-4 text-emerald-400" />,
      tag: 'Unseen Test',
    },
  ];

  return (
    <div
      className={`bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all ${className}`}
    >
      {/* Header Bar */}
      <div
        onClick={() => allowToggle && setIsExpanded(!isExpanded)}
        className={`p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-r from-slate-900 to-slate-900/80 hover:from-slate-850 hover:to-slate-900 border-b ${
          isExpanded ? 'border-slate-800' : 'border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${scopeMeta.bgClass} ${scopeMeta.textClass} ${scopeMeta.borderClass}`}
              >
                [{scopeMeta.badgeLabel}]
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {config.strategyVersion}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyJson();
            }}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Copy Full Configuration JSON"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Config</span>
              </>
            )}
          </button>

          {allowToggle && (
            <div className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          )}
        </div>
      </div>

      {/* Expanded 14-Item Configuration Grid */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Top Metadata Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Config Identifier
              </span>
              <div className="font-mono text-emerald-400 font-bold truncate mt-0.5">
                {config.configId}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Scope Protocol
              </span>
              <div className="font-semibold text-slate-200 truncate mt-0.5">
                {scopeMeta.label}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Integrity Signature
              </span>
              <div className="font-mono text-[11px] text-slate-400 truncate mt-0.5" title={config.checksumSignature}>
                {config.checksumSignature}
              </div>
            </div>
          </div>

          {/* 14 Mandatory Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {configItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/60 hover:bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {item.tag}
                  </span>
                </div>
                <div className="text-xs font-bold text-white leading-snug break-words">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {config.notes && (
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">Methodology Notes: </strong>
                {config.notes}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
