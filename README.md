# TradeAI v2 — Quantitative Trading Research Lab

TradeAI v2 is an educational quantitative trading research platform that combines AI-assisted market analysis, technical indicators, paper trading, algorithmic backtesting, and walk-forward validation in one interactive web application.

## 🚀 Live Demo

https://tradeai-v2-research-lab-1.vercel.app/

## ✨ Features

- 🤖 AI-assisted market analysis
- 📊 Technical indicator analysis
- 💹 Simulated paper trading
- 📈 Algorithmic backtesting
- 🧪 Walk-forward / out-of-sample validation
- 📉 Risk and performance metrics
- 📋 Trade and transaction history
- 🌐 Vercel deployment

## 🤖 AI Market Analyst

The AI Analyst provides structured analysis of selected equities using technical indicators and AI-assisted reasoning.

It displays:

- BUY / SELL signals
- Confidence score
- Market trend
- Momentum
- RSI
- SMA 20 / SMA 50
- MACD
- ATR
- Entry range
- Stop-loss and take-profit levels
- Explanation of the generated signal

## 📊 Backtesting Strategies

TradeAI supports:

1. SMA Golden / Death Crossover
2. RSI Overbought / Oversold Mean Reversion
3. MACD Trend & Signal Crossover
4. Bollinger Bands Mean Reversion
5. Multi-Indicator Strategy using SMA + RSI + MACD

Backtesting provides:

- Initial capital
- Strategy parameters
- Trading costs and slippage
- Total trades
- Win rate
- Net return
- Final capital
- Maximum drawdown
- Profit factor
- Equity curve
- Trade history

## 💹 Paper Trading

TradeAI provides a simulated paper-trading environment using virtual capital.

Users can:

- Open simulated positions
- Close positions
- Track unrealized P/L
- Track realized P/L
- View transaction history
- Experiment without risking real money

## 🧪 Walk-Forward Validation

The Validation Suite evaluates strategy behaviour using out-of-sample data.

Example validation results:

| Metric | Result |
|---|---:|
| OOS Trades | 145 |
| OOS Win Rate | 25.52% |
| OOS Net Return | -1.39% |
| OOS Profit Factor | 0.92 |
| Maximum Drawdown | 5.81% |
| Sharpe Ratio | -1.27 |
| Sortino Ratio | -2.88 |

These results demonstrate why out-of-sample validation is important when evaluating quantitative strategies.

## 📈 Example Backtesting Results

### SMA Golden / Death Crossover

Example simulated result on the selected GOOGL historical dataset:

| Metric | Result |
|---|---:|
| Initial Capital | ₹1,00,000 |
| Final Capital | ₹1,14,934.26 |
| Net Return | +14.93% |
| Total Trades | 1 |
| Win Rate | 100% |
| Maximum Drawdown | -3.30% |

### MACD Trend & Signal Crossover

Example simulated result:

| Metric | Result |
|---|---:|
| Initial Capital | ₹1,00,000 |
| Final Capital | ₹1,05,238.25 |
| Net Return | +5.24% |
| Total Trades | 9 |
| Win Rate | 44.4% |
| Maximum Drawdown | -3.62% |
| Profit Factor | 2.18 |

> These are simulated historical backtest results from the application's research environment and do not guarantee future performance.

## 🛠️ Technology Stack

- React
- TypeScript
- Vite
- Node.js
- Express
- Vercel Functions
- Google Gemini API
- Git
- GitHub
- Google AI Studio

## 📁 Project Structure

```text
TradeAI-v2-Quantitative-Trading-Lab/
├── api/
├── src/
├── assets/
├── server.ts
├── index.html
├── package.json
├── bun.lock
├── vercel.json
├── vite.config.ts
├── tsconfig.json
├── metadata.json
├── .env.example
└── README.md
## ⚙️ Running Locally

Clone the repository:

```bash
git clone https://github.com/preethammk14/TradeAI-v2-Quantitative-Trading-Lab.git
cd TradeAI-v2-Quantitative-Trading-Lab
