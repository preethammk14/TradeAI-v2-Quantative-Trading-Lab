import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ObservationPage } from './pages/ObservationPage';
import { ExperimentLabPage } from './pages/ExperimentLabPage';
import { MarketExplorerPage } from './pages/MarketExplorerPage';
import { AiAnalystPage } from './pages/AiAnalystPage';
import { PaperTradingPage } from './pages/PaperTradingPage';
import { BacktestingPage } from './pages/BacktestingPage';
import { ValidationPage } from './pages/ValidationPage';
import { BenchmarkComparisonPage } from './pages/BenchmarkComparisonPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { TradeHistoryPage } from './pages/TradeHistoryPage';
import { RiskPage } from './pages/RiskPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { DisclaimerPage } from './pages/DisclaimerPage';

import { marketDataService } from './services/marketDataService';
import { paperTradingService } from './services/paperTradingService';
import { MOCK_STOCKS } from './data/mockStocks';
import { StockQuote, PortfolioSummary, PaperTrade } from './types';

const initialPortfolio = paperTradingService.getPortfolioSummary(MOCK_STOCKS);

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');

  const [quotes, setQuotes] = useState<StockQuote[]>(MOCK_STOCKS);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>(initialPortfolio.summary);
  const [trades, setTrades] = useState<PaperTrade[]>(initialPortfolio.updatedTrades);

  const refreshData = async () => {
    const fetchedQuotes = await marketDataService.getStockQuotes();
    setQuotes(fetchedQuotes);

    const { summary, updatedTrades } = paperTradingService.getPortfolioSummary(fetchedQuotes);
    setPortfolioSummary(summary);
    setTrades(updatedTrades);
  };

  useEffect(() => {
    refreshData();

    // Refresh every 15 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const openTrades = trades.filter((t) => t.status === 'OPEN');

  const toggleCurrency = () => {
    setCurrencySymbol((prev) => (prev === '₹' ? '$' : '₹'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Sticky Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        currencySymbol={currencySymbol}
        onToggleCurrency={toggleCurrency}
      />

      {/* Main Container View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardPage
            quotes={quotes}
            portfolioSummary={portfolioSummary}
            recentTrades={trades}
            currencySymbol={currencySymbol}
            onSelectStock={(sym) => setSelectedSymbol(sym)}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'experiment-lab' && (
          <ExperimentLabPage
            currencySymbol={currencySymbol}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'observation' && (
          <ObservationPage
            quotes={quotes}
            currencySymbol={currencySymbol}
            onSelectStock={(sym) => setSelectedSymbol(sym)}
          />
        )}

        {activeTab === 'explorer' && (
          <MarketExplorerPage
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            onSelectStock={(sym) => setSelectedSymbol(sym)}
            currencySymbol={currencySymbol}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'ai-analyst' && (
          <AiAnalystPage
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            onSelectStock={(sym) => setSelectedSymbol(sym)}
            currencySymbol={currencySymbol}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'paper-trading' && (
          <PaperTradingPage
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            onSelectStock={(sym) => setSelectedSymbol(sym)}
            currencySymbol={currencySymbol}
            availableCash={portfolioSummary.availableCash}
            openTrades={openTrades}
            trades={trades}
            onTradeExecuted={refreshData}
          />
        )}

        {activeTab === 'backtesting' && (
          <BacktestingPage
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            onSelectStock={(sym) => setSelectedSymbol(sym)}
            currencySymbol={currencySymbol}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationPage currencySymbol={currencySymbol} />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarkComparisonPage currencySymbol={currencySymbol} />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioPage
            portfolioSummary={portfolioSummary}
            openTrades={openTrades}
            quotes={quotes}
            currencySymbol={currencySymbol}
            onTradeExecuted={refreshData}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'trade-history' && (
          <TradeHistoryPage
            trades={trades}
            currencySymbol={currencySymbol}
            onTradeExecuted={refreshData}
            quotes={quotes}
          />
        )}

        {activeTab === 'risk' && (
          <RiskPage
            portfolioSummary={portfolioSummary}
            openTrades={openTrades}
            currencySymbol={currencySymbol}
          />
        )}

        {activeTab === 'methodology' && <MethodologyPage />}

        {activeTab === 'disclaimer' && <DisclaimerPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-2">
          <p>
            TradeAI by PMK — AI-Powered Stock Market Analysis & Educational Paper Trading Simulator
          </p>
          <p className="text-[11px] text-slate-600">
            Designed for educational and research demonstration purposes. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
