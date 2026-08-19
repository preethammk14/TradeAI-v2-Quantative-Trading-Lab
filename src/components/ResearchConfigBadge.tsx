import React, { useState } from 'react';
import { Layers, Database, ShieldCheck, ExternalLink, Info, Check, Copy } from 'lucide-react';
import { ResultScopeTag, ResearchConfig } from '../types/researchTypes';
import { SCOPE_REGISTRY } from '../services/metricConsistencyService';

interface ResearchConfigBadgeProps {
  scope: ResultScopeTag;
  strategyVersion?: string;
  config?: ResearchConfig;
  configId?: string;
  size?: 'sm' | 'md';
  showDetailsButton?: boolean;
  onViewConfig?: () => void;
  className?: string;
}

export const ResearchConfigBadge: React.FC<ResearchConfigBadgeProps> = ({
  scope,
  strategyVersion = 'CH5-V1.5.0',
  config,
  configId,
  size = 'md',
  showDetailsButton = true,
  onViewConfig,
  className = '',
}) => {
  const meta = SCOPE_REGISTRY[scope] || SCOPE_REGISTRY.BACKTEST;
  const [copied, setCopied] = useState(false);
  const displayConfigId = config?.configId || configId || 'CFG-STD';

  const handleCopySig = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `Scope: ${meta.badgeLabel} | Version: ${strategyVersion} | Config: ${displayConfigId}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${meta.bgClass} ${meta.textClass} ${meta.borderClass} ${className}`}
        title={`${meta.label} — Strategy Version: ${strategyVersion}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>[{meta.badgeLabel}]</span>
        <span className="text-slate-400 font-mono">({strategyVersion})</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center flex-wrap gap-2 px-3 py-1.5 rounded-xl border bg-slate-950/80 ${meta.borderClass} text-xs ${className}`}
    >
      {/* Scope Tag */}
      <div className={`flex items-center gap-1.5 font-black uppercase tracking-wider px-2 py-0.5 rounded ${meta.bgClass} ${meta.textClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span>[{meta.badgeLabel}]</span>
      </div>

      {/* Version Tag */}
      <div className="flex items-center gap-1 text-slate-300 font-semibold">
        <span className="text-slate-500">Version:</span>
        <span className="font-mono text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
          {strategyVersion}
        </span>
      </div>

      {/* Config ID Tag */}
      <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px] hidden sm:flex">
        <span className="text-slate-500">Config:</span>
        <span>{displayConfigId}</span>
      </div>

      {/* Copy / Details trigger */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={handleCopySig}
          className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
          title="Copy Research Configuration Tag"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {showDetailsButton && onViewConfig && (
          <button
            onClick={onViewConfig}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 pl-1"
          >
            <span>Config Spec</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
