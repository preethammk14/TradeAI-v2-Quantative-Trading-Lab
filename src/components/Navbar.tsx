import React, { useState } from 'react';
import {
  LayoutDashboard,
  Search,
  BrainCircuit,
  TrendingUp,
  History,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  Menu,
  X,
  LineChart,
  Scale,
  Eye,
  FlaskConical,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'observation'
  | 'experiment-lab'
  | 'explorer'
  | 'ai-analyst'
  | 'paper-trading'
  | 'backtesting'
  | 'validation'
  | 'benchmarks'
  | 'portfolio'
  | 'trade-history'
  | 'risk'
  | 'methodology'
  | 'disclaimer';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currencySymbol: string;
  onToggleCurrency: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currencySymbol,
  onToggleCurrency,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'experiment-lab', label: 'Experiment Lab', icon: <FlaskConical className="w-4 h-4 text-emerald-400" /> },
    { id: 'observation', label: 'Paper Observation', icon: <Eye className="w-4 h-4 text-teal-400" /> },
    { id: 'backtesting', label: 'Backtesting', icon: <LineChart className="w-4 h-4 text-amber-400" /> },
    { id: 'validation', label: 'Validation Suite', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
    { id: 'benchmarks', label: 'Benchmark Suite', icon: <Scale className="w-4 h-4 text-indigo-400" /> },
    { id: 'explorer', label: 'Market Explorer', icon: <Search className="w-4 h-4" /> },
    { id: 'ai-analyst', label: 'AI Analyst', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'paper-trading', label: 'Paper Trading', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'portfolio', label: 'Portfolio', icon: <PieChart className="w-4 h-4" /> },
    { id: 'trade-history', label: 'Trade History', icon: <History className="w-4 h-4" /> },
    { id: 'risk', label: 'Risk Mgmt', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'methodology', label: 'Methodology', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'disclaimer', label: 'Disclaimer', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">TradeAI <span className="text-emerald-400">v2</span></span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Research Lab
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Quantitative Research & Paper Trading Simulator
              </p>
            </div>
          </div>

          {/* Currency Toggle & Quick Action */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={onToggleCurrency}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-slate-700 transition-all flex items-center gap-1.5"
              title="Toggle display currency format"
            >
              <span className="text-slate-500">Currency:</span>
              <span className="text-emerald-400 font-bold">{currencySymbol}</span>
            </button>

            <button
              onClick={() => handleSelectTab('ai-analyst')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Run AI Analysis</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onToggleCurrency}
              className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-emerald-400"
            >
              {currencySymbol}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Link Bar */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-800 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
