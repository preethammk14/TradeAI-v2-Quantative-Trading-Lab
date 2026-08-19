import React, { useState } from 'react';
import {
  FlaskConical,
  Lock,
  Clock,
  ShieldCheck,
  Sliders,
  Database,
  Layers,
  Sparkles,
  GitBranch,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Info,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { DemoDataBadge } from '../components/DemoDataBadge';
import { PaperTradingNotice } from '../components/PaperTradingNotice';
import { ResearchConfigurationSection } from '../components/ResearchConfigurationSection';
import { ResearchConfigBadge } from '../components/ResearchConfigBadge';
import { AuditLogTable } from '../components/AuditLogTable';
import { strategyVersioningService } from '../services/strategyVersioningService';
import {
  researchConfigService,
  DEFAULT_CHAMPION_RESEARCH_CONFIG,
  BACKTEST_DEFAULT_RESEARCH_CONFIG,
  BENCHMARK_SUITE_RESEARCH_CONFIG,
  FRICTION_SENSITIVITY_RESEARCH_CONFIG,
} from '../services/researchConfigService';
import { StrategyVersionInfo, ResearchConfig } from '../types/researchTypes';

interface ExperimentLabPageProps {
  currencySymbol?: string;
  onNavigateTab?: (tab: any) => void;
}

export const ExperimentLabPage: React.FC<ExperimentLabPageProps> = ({
  currencySymbol = '₹',
  onNavigateTab,
}) => {
  const versions = strategyVersioningService.getAllVersions();
  const baseline = strategyVersioningService.getBaselineVersion();

  const [selectedVersion, setSelectedVersion] = useState<StrategyVersionInfo>(baseline);
  const [selectedPresetConfig, setSelectedPresetConfig] = useState<ResearchConfig>(
    DEFAULT_CHAMPION_RESEARCH_CONFIG
  );

  const presets = [
    {
      id: 'CHAMPION_WF',
      label: 'Champion #5 Walk-Forward OOS Protocol (16,400 Candles)',
      config: DEFAULT_CHAMPION_RESEARCH_CONFIG,
      badge: 'OUT-OF-SAMPLE',
    },
    {
      id: 'BENCHMARK',
      label: 'Independent 6-Strategy Benchmark Suite (8,400 Candles)',
      config: BENCHMARK_SUITE_RESEARCH_CONFIG,
      badge: 'BENCHMARK',
    },
    {
      id: 'FRICTION',
      label: 'Friction & Adverse Slippage Stress Matrix (6 Tiers)',
      config: FRICTION_SENSITIVITY_RESEARCH_CONFIG,
      badge: 'FRICTION SENSITIVITY',
    },
    {
      id: 'BACKTEST',
      label: 'Single-Asset Historical Exploration Protocol (252 Candles)',
      config: BACKTEST_DEFAULT_RESEARCH_CONFIG,
      badge: 'BACKTEST',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Demo Data Indicator */}
      <DemoDataBadge />

      {/* Mandatory Paper Trading Notice */}
      <PaperTradingNotice />

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>TradeAI v2 — Quantitative Research Lab</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    INFRASTRUCTURE ACTIVE
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Versioned Strategy Registry, Immutable Control Baseline, Standardized Research Configurations & Reproducibility Ledger
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Immutable Baseline</div>
                <div className="font-mono font-bold text-emerald-400">CH5-V1.5.0 (Frozen)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Versioning Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Strategy Versioning Registry (Control vs Staged Hypotheses)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {versions.length} Registered Strategy Architectures
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {versions.map((v) => {
            const isBase = v.status === 'LOCKED_BASELINE';
            const isSelected = selectedVersion.versionId === v.versionId;

            return (
              <div
                key={v.versionId}
                onClick={() => setSelectedVersion(v)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative ${
                  isSelected
                    ? 'bg-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white">
                    {v.versionId}
                  </span>
                  {isBase ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Lock className="w-3 h-3" />
                      <span>IMMUTABLE BASELINE</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Clock className="w-3 h-3" />
                      <span>QUEUED (PHASE 2)</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-200 line-clamp-1">{v.name}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {v.description}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-850 text-[10px] font-mono text-slate-300 line-clamp-2">
                  {v.parametersSummary}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-850">
                  <span>{v.researchFocus}</span>
                  <span className="font-semibold text-emerald-400">
                    {isSelected ? 'Selected' : 'Click to inspect'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Version Detail Card */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-emerald-400">
                  {selectedVersion.versionId}
                </span>
                <h3 className="text-sm font-bold text-white">{selectedVersion.name}</h3>
                {selectedVersion.isImmutable && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    LOCKED CONTROL BASELINE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{selectedVersion.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-400">Entry Logic</span>
              <div className="font-mono text-[11px] text-slate-200">{selectedVersion.rules.entry}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-rose-400">Exit Logic</span>
              <div className="font-mono text-[11px] text-slate-200">{selectedVersion.rules.exit}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-sky-400">Indicator Suite</span>
              <div className="font-mono text-[11px] text-slate-200">{selectedVersion.rules.indicators}</div>
            </div>
          </div>

          {selectedVersion.hypothesis && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-400">Quantitative Hypothesis: </strong>
                {selectedVersion.hypothesis}
              </div>
            </div>
          )}

          {!selectedVersion.isImmutable && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Staging Mode:</strong> This experimental branch is registered for research tracking. No parameters or execution engines have been altered yet.
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded text-amber-400">
                Phase 2 Ready
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Preset Research Configuration Inspector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Standard Research Configuration Presets
            </h2>
          </div>
          <span className="text-xs text-slate-400">14-Point Standard Configuration Specification</span>
        </div>

        {/* Preset Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {presets.map((p) => {
            const isSelected = selectedPresetConfig.configId === p.config.configId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPresetConfig(p.config)}
                className={`p-3 rounded-xl border text-left text-xs transition-all space-y-1 ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/60 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{p.config.configId}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                    [{p.badge}]
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{p.label}</div>
              </button>
            );
          })}
        </div>

        {/* Full 14-point Research Configuration Section */}
        <ResearchConfigurationSection
          config={selectedPresetConfig}
          title={`Active Research Specification: ${selectedPresetConfig.configName}`}
          subtitle="Showing all 14 mandatory quantitative parameters, dataset bounds, and friction assumptions"
        />
      </div>

      {/* Experiment Lab Staging & Optimization Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Experiment Lab Staging Environment
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Phase 1: Research Infrastructure</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Implemented 14-parameter Research Configurations, Strategy Versioning registry, Metric Consistency enforcement, and the Experiment Audit Log.
            </p>
            <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              COMPLETED & VERIFIED
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>Baseline Control Protection</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Champion #5 v1.5.0 parameters, calculations, and signals are 100% frozen and protected as an immutable benchmark reference.
            </p>
            <span className="inline-block text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              IMMUTABILITY LOCKED
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <Clock className="w-4 h-4" />
              <span>Phase 2: Strategy Optimization</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Staged experiments (V2-A, V2-B, V2-C) are queued. Execution engines remain paused to ensure scientific discipline before optimization.
            </p>
            <span className="inline-block text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              QUEUED FOR PHASE 2
            </span>
          </div>
        </div>
      </div>

      {/* Full Audit Log & Reproducibility Ledger */}
      <AuditLogTable currencySymbol={currencySymbol} />
    </div>
  );
};
