import React, { useState, useEffect } from 'react';
import {
  Radio,
  Clock,
  Zap,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ServerOff,
  PauseCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LiveMarketFeedStatus, MarketDataStatusType } from '../types/marketFeedTypes';
import { marketDataManager } from '../services/marketDataProvider';

interface MarketDataFeedStatusBadgeProps {
  compact?: boolean;
  onOpenObservationModal?: () => void;
}

export const MarketDataFeedStatusBadge: React.FC<MarketDataFeedStatusBadgeProps> = ({
  compact = false,
}) => {
  const [feedStatus, setFeedStatus] = useState<LiveMarketFeedStatus>(marketDataManager.getStatus());
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  useEffect(() => {
    const checkFeed = async () => {
      const status = await marketDataManager.refreshStatus();
      setFeedStatus(status);
    };
    checkFeed();
    const interval = setInterval(checkFeed, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadgeConfig = (status: MarketDataStatusType) => {
    switch (status) {
      case 'LIVE_MARKET_DATA':
        return {
          label: '🟢 LIVE MARKET DATA',
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
          dotColor: 'bg-emerald-400',
          pingColor: 'bg-emerald-400',
        };
      case 'DELAYED_MARKET_DATA':
        return {
          label: '🟡 DELAYED MARKET DATA (15m)',
          textColor: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          dotColor: 'bg-yellow-400',
          pingColor: 'bg-yellow-400',
        };
      case 'DEMO_SYNTHETIC_DATA':
        return {
          label: '🟠 DEMO DATA MODE — LIVE DATA NOT CONNECTED',
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          dotColor: 'bg-amber-400',
          pingColor: 'bg-amber-400',
        };
      case 'DATA_FEED_INVALID_PAUSED':
        return {
          label: '🔴 DATA FEED INVALID — PAPER TRADING PAUSED',
          textColor: 'text-red-400',
          bgColor: 'bg-red-500/15',
          borderColor: 'border-red-500/40',
          dotColor: 'bg-red-500',
          pingColor: 'bg-red-400',
        };
      case 'DATA_FEED_OFFLINE':
      default:
        return {
          label: feedStatus.statusMessage || 'DEMO DATA MODE — LIVE DATA NOT CONNECTED',
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          dotColor: 'bg-amber-400',
          pingColor: 'bg-amber-400',
        };
    }
  };

  const currentConfig = getStatusBadgeConfig(feedStatus.status);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${currentConfig.bgColor} ${currentConfig.textColor} border ${currentConfig.borderColor}`}
        title={`Provider: ${feedStatus.providerName} | Latency: ${feedStatus.latencyMs}ms`}
      >
        <span className="flex h-2 w-2 relative">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentConfig.pingColor} opacity-75`}
          ></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${currentConfig.dotColor}`}></span>
        </span>
        {currentConfig.label}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border ${currentConfig.borderColor} rounded-xl text-xs text-slate-300 shadow-lg`}
      >
        {/* Left Side: Accurate Feed Status Indicator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentConfig.pingColor} opacity-75`}
            ></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentConfig.dotColor}`}></span>
          </span>
          <span className={`font-bold tracking-wide ${currentConfig.textColor}`}>
            {currentConfig.label}
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Provider Meta Details */}
          <span className="text-slate-400 font-medium hidden md:inline-flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            Provider: <strong className="text-slate-200">{feedStatus.providerName}</strong>
          </span>

          <span className="text-slate-600 hidden md:inline">|</span>

          <span className="text-slate-400 font-medium hidden md:inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {feedStatus.latencyMs !== null && feedStatus.status !== 'DATA_FEED_OFFLINE'
                ? <>Latency: <strong className="text-slate-200">{feedStatus.latencyMs} ms</strong></>
                : <span className="text-slate-400">Latency: <strong className="text-slate-300">N/A</strong></span>}
            </span>
          </span>

          <span className="text-slate-600 hidden md:inline">|</span>

          <span className="text-slate-400 font-medium hidden lg:inline-flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Mode: <strong className="text-slate-200">{feedStatus.dataMode || (feedStatus.status === 'DATA_FEED_OFFLINE' ? 'OFFLINE' : 'LIVE')}</strong>
          </span>
        </div>

        {/* Right Side: Paper Trading Badge & Config Details Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfigDetails(!showConfigDetails)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50"
          >
            <span>Feed Details</span>
            {showConfigDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider text-[11px]">PAPER TRADING ONLY — 100% SIMULATED</span>
          </div>
        </div>
      </div>

      {/* Expanded Provider Configuration & Truthful Status Panel */}
      {showConfigDetails && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Provider & Mode</span>
              <span className="text-white font-semibold block truncate">{feedStatus.providerName}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400 text-[10px]">Data Mode:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300">
                  {feedStatus.dataMode || 'OFFLINE'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Symbol & Latest Price</span>
              <span className="text-white font-mono font-bold">{feedStatus.symbol || 'RELIANCE.BSE'}</span>
              <div className="text-[11px] mt-0.5 font-mono">
                {feedStatus.latestPrice !== null && feedStatus.latestPrice !== undefined
                  ? <span className="text-emerald-400 font-bold">₹{feedStatus.latestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  : <span className="text-slate-500">Price: N/A (Offline)</span>}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Observation & Latency</span>
              <span className="text-white font-mono text-[11px] block">
                {feedStatus.lastSuccessfulUpdateTimestamp
                  ? new Date(feedStatus.lastSuccessfulUpdateTimestamp).toLocaleTimeString()
                  : 'N/A (Feed Offline)'}
              </span>
              <span className="text-slate-400 block text-[10px] mt-0.5">
                {feedStatus.latencyMs !== null && feedStatus.status !== 'DATA_FEED_OFFLINE'
                  ? <strong className="text-emerald-400 font-mono">Latency: {feedStatus.latencyMs} ms</strong>
                  : <span className="text-slate-400 font-mono">Latency: N/A</span>}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Error / Rate Limit Status</span>
              <span className={feedStatus.lastErrorMessage ? 'text-rose-400 font-medium truncate block text-[11px]' : 'text-emerald-400 font-medium text-[11px]'}>
                {feedStatus.lastErrorMessage ? feedStatus.lastErrorMessage : 'None (Feed Healthy)'}
              </span>
              <span className="text-slate-400 block text-[10px] mt-0.5 truncate">
                {feedStatus.pauseReason || 'Normal paper trading active'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Real Market-Data Integration Guide</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              To connect real Indian equities market data, configure <code className="text-amber-400 font-mono">ALPHA_VANTAGE_API_KEY</code> in the environment. In this sandboxed environment without active external API credentials, the system truthfully reports <span className="text-rose-400 font-semibold">DATA_FEED_OFFLINE</span> with <span className="text-slate-300 font-mono">Latency: N/A</span>, and paper trading fails safe.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
