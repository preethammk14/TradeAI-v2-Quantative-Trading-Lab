import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Download,
  Filter,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { ExperimentAuditLogEntry, ResultScopeTag } from '../types/researchTypes';
import { experimentAuditLogService } from '../services/experimentAuditLogService';
import { SCOPE_REGISTRY } from '../services/metricConsistencyService';

interface AuditLogTableProps {
  initialEntries?: ExperimentAuditLogEntry[];
  currencySymbol?: string;
  onSelectEntry?: (entry: ExperimentAuditLogEntry) => void;
  className?: string;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  initialEntries,
  currencySymbol = '₹',
  onSelectEntry,
  className = '',
}) => {
  const [entries, setEntries] = useState<ExperimentAuditLogEntry[]>(
    initialEntries || experimentAuditLogService.getAllEntries()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('ALL');
  const [selectedVersion, setSelectedVersion] = useState<string>('ALL');
  const [selectedModalEntry, setSelectedModalEntry] = useState<ExperimentAuditLogEntry | null>(null);

  const refreshEntries = () => {
    setEntries(experimentAuditLogService.getAllEntries());
  };

  const handleExportCsv = () => {
    const csvContent = experimentAuditLogService.exportToCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tradeai_v2_experiment_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = entries.filter((entry) => {
    if (selectedScope !== 'ALL' && entry.scope !== selectedScope) return false;
    if (selectedVersion !== 'ALL' && entry.strategyVersion !== selectedVersion) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        entry.id.toLowerCase().includes(q) ||
        entry.strategyVersion.toLowerCase().includes(q) ||
        entry.dataset.toLowerCase().includes(q) ||
        entry.parameterChanges.toLowerCase().includes(q) ||
        entry.configId.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const uniqueVersions = Array.from(new Set(entries.map((e) => e.strategyVersion)));
  const uniqueScopes: ResultScopeTag[] = ['BACKTEST', 'VALIDATION', 'OUT_OF_SAMPLE', 'BENCHMARK', 'FRICTION_SENSITIVITY'];

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-5 ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Experiment Audit Log & Reproducibility Ledger</h2>
          </div>
          <p className="text-xs text-slate-400">
            Immutable trace of strategy versions, parameter specs, datasets, friction assumptions, and verified results
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit Log (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search experiments, versions, datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Scope Filter */}
        <div>
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Test Scopes</option>
            {uniqueScopes.map((scope) => {
              const meta = SCOPE_REGISTRY[scope];
              return (
                <option key={scope} value={scope}>
                  [{meta.badgeLabel}] {meta.label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Version Filter */}
        <div>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Strategy Versions</option>
            {uniqueVersions.map((v) => (
              <option key={v} value={v}>
                Version: {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table of Audit Entries */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-3">Experiment ID</th>
              <th className="py-3 px-3">Strategy Version</th>
              <th className="py-3 px-3">Scope</th>
              <th className="py-3 px-3">Dataset</th>
              <th className="py-3 px-3">Friction Model</th>
              <th className="py-3 px-3">Trades</th>
              <th className="py-3 px-3">Net Return</th>
              <th className="py-3 px-3">Profit Factor</th>
              <th className="py-3 px-3">Max DD</th>
              <th className="py-3 px-3">Date/Time</th>
              <th className="py-3 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  No experiment audit entries match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const meta = SCOPE_REGISTRY[entry.scope] || SCOPE_REGISTRY.BACKTEST;
                const isPositive = entry.resultMetrics.netPnl >= 0;

                return (
                  <tr
                    key={entry.id}
                    onClick={() => {
                      setSelectedModalEntry(entry);
                      if (onSelectEntry) onSelectEntry(entry);
                    }}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    {/* Experiment ID */}
                    <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                      {entry.id}
                    </td>

                    {/* Version */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {entry.strategyVersion}
                      </span>
                    </td>

                    {/* Scope */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                      >
                        [{meta.badgeLabel}]
                      </span>
                    </td>

                    {/* Dataset */}
                    <td className="py-3 px-3 text-slate-300 max-w-[180px] truncate" title={entry.dataset}>
                      {entry.dataset}
                    </td>

                    {/* Friction */}
                    <td className="py-3 px-3 text-slate-400 max-w-[160px] truncate" title={entry.frictionAssumptions}>
                      {entry.frictionAssumptions}
                    </td>

                    {/* Trades */}
                    <td className="py-3 px-3 font-semibold text-white">
                      {entry.resultMetrics.totalTrades}
                    </td>

                    {/* Return */}
                    <td className={`py-3 px-3 font-bold whitespace-nowrap ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}
                      {currencySymbol}
                      {entry.resultMetrics.netPnl.toLocaleString('en-IN')} ({isPositive ? '+' : ''}
                      {entry.resultMetrics.returnPercent}%)
                    </td>

                    {/* PF */}
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {entry.resultMetrics.profitFactor.toFixed(2)}
                    </td>

                    {/* Max DD */}
                    <td className="py-3 px-3 font-semibold text-rose-400">
                      {entry.resultMetrics.maxDrawdownPercent}%
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center justify-end gap-1 ml-auto"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Audit Entry Modal */}
      {selectedModalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedModalEntry(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Experiment Audit Record Details</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedModalEntry.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedModalEntry(null)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Strategy Version</span>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">{selectedModalEntry.strategyVersion}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Result Scope</span>
                <div className="text-sky-400 font-bold text-sm mt-0.5">[{selectedModalEntry.scope}]</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Dataset Specification</span>
                <div className="text-slate-200 font-medium mt-0.5">{selectedModalEntry.dataset}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Friction & Cost Assumptions</span>
                <div className="text-slate-200 font-medium mt-0.5">{selectedModalEntry.frictionAssumptions}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Parameter Configuration Changes</span>
                <div className="text-slate-200 font-mono text-[11px] mt-0.5">{selectedModalEntry.parameterChanges}</div>
              </div>
            </div>

            {/* Verified Result Metrics */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Verified Result Metrics</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">Total Trades</div>
                  <div className="text-base font-bold text-white">{selectedModalEntry.resultMetrics.totalTrades}</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">Win Rate</div>
                  <div className="text-base font-bold text-emerald-400">{selectedModalEntry.resultMetrics.winRate}%</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">Profit Factor</div>
                  <div className="text-base font-bold text-indigo-400">{selectedModalEntry.resultMetrics.profitFactor.toFixed(2)}</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-400">Max Drawdown</div>
                  <div className="text-base font-bold text-rose-400">{selectedModalEntry.resultMetrics.maxDrawdownPercent}%</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-850">
                <span>Net PnL: <strong className="text-emerald-400">+{currencySymbol}{selectedModalEntry.resultMetrics.netPnl.toLocaleString('en-IN')} (+{selectedModalEntry.resultMetrics.returnPercent}%)</strong></span>
                <span>Expectancy: <strong className="text-white">+{currencySymbol}{selectedModalEntry.resultMetrics.expectancy.toFixed(2)}/trade</strong></span>
              </div>
            </div>

            {/* Notes */}
            {selectedModalEntry.notes && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <strong className="text-slate-400">Audit Notes: </strong>
                {selectedModalEntry.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
