import {
  calculateATR,
  calculateBollingerBands,
  calculateMACD,
  calculateRSI,
  calculateSMA,
} from './technicalAnalysisService';
import {
  BacktestParams,
  BacktestResult,
  BacktestTrade,
  PricePoint,
} from '../types';

export class BacktestingService {
  public runBacktest(history: PricePoint[], params: BacktestParams): BacktestResult {
    const {
      symbol,
      strategy,
      startingCapital = 100000,
      // SMA parameters
      fastPeriod = 20,
      slowPeriod = 50,
      // RSI parameters
      rsiPeriod = 14,
      rsiOverbought = 70,
      rsiOversold = 30,
      // MACD parameters
      macdFastPeriod = 12,
      macdSlowPeriod = 26,
      macdSignalPeriod = 9,
      // Bollinger Bands parameters
      bollingerPeriod = 20,
      bollingerStdDev = 2.0,
      // Phase A: Friction
      slippagePercent = 0,
      brokeragePerTrade = 0,
      regulatoryFeePercent = 0,
    } = params;

    if (!history || history.length < 50) {
      throw new Error('Insufficient price history for reliable backtesting (minimum 50 days required).');
    }

    // Parameter Validations
    if (strategy === 'SMA_CROSSOVER') {
      if (fastPeriod < 5 || fastPeriod > 50) {
        throw new Error('Fast SMA period must be between 5 and 50.');
      }
      if (slowPeriod < 20 || slowPeriod > 200) {
        throw new Error('Slow SMA period must be between 20 and 200.');
      }
      if (fastPeriod >= slowPeriod) {
        throw new Error(`Fast SMA period (${fastPeriod}) must be less than Slow SMA period (${slowPeriod}).`);
      }
    } else if (strategy === 'RSI_STRATEGY') {
      if (rsiPeriod < 7 || rsiPeriod > 21) {
        throw new Error('RSI period must be between 7 and 21.');
      }
      if (rsiOversold < 20 || rsiOversold > 40) {
        throw new Error('RSI oversold threshold must be between 20 and 40.');
      }
      if (rsiOverbought < 60 || rsiOverbought > 80) {
        throw new Error('RSI overbought threshold must be between 60 and 80.');
      }
      if (rsiOversold >= rsiOverbought) {
        throw new Error(`RSI oversold threshold (${rsiOversold}) must be less than overbought threshold (${rsiOverbought}).`);
      }
    } else if (strategy === 'MACD_STRATEGY') {
      if (macdFastPeriod < 8 || macdFastPeriod > 16) {
        throw new Error('MACD fast period must be between 8 and 16.');
      }
      if (macdSlowPeriod < 20 || macdSlowPeriod > 30) {
        throw new Error('MACD slow period must be between 20 and 30.');
      }
      if (macdSignalPeriod < 5 || macdSignalPeriod > 12) {
        throw new Error('MACD signal period must be between 5 and 12.');
      }
      if (macdFastPeriod >= macdSlowPeriod) {
        throw new Error(`MACD fast period (${macdFastPeriod}) must be less than slow period (${macdSlowPeriod}).`);
      }
    } else if (strategy === 'BOLLINGER_STRATEGY') {
      if (bollingerPeriod < 10 || bollingerPeriod > 30) {
        throw new Error('Bollinger Bands period must be between 10 and 30.');
      }
      if (bollingerStdDev < 1.5 || bollingerStdDev > 3.0) {
        throw new Error('Bollinger standard deviation multiplier must be between 1.5 and 3.0.');
      }
    } else if (strategy === 'SMA_RSI_STRATEGY') {
      if (fastPeriod < 5 || fastPeriod > 50) {
        throw new Error('Fast SMA period must be between 5 and 50.');
      }
      if (slowPeriod < 20 || slowPeriod > 200) {
        throw new Error('Slow SMA period must be between 20 and 200.');
      }
      if (fastPeriod >= slowPeriod) {
        throw new Error(`Fast SMA period (${fastPeriod}) must be less than Slow SMA period (${slowPeriod}).`);
      }
      if (rsiPeriod < 7 || rsiPeriod > 21) {
        throw new Error('RSI period must be between 7 and 21.');
      }
    } else if (strategy === 'COMBINED_STRATEGY') {
      if (fastPeriod < 5 || fastPeriod > 50) {
        throw new Error('Fast SMA period must be between 5 and 50.');
      }
      if (slowPeriod < 20 || slowPeriod > 200) {
        throw new Error('Slow SMA period must be between 20 and 200.');
      }
      if (fastPeriod >= slowPeriod) {
        throw new Error(`Fast SMA period (${fastPeriod}) must be less than Slow SMA period (${slowPeriod}).`);
      }
      if (rsiPeriod < 7 || rsiPeriod > 21) {
        throw new Error('RSI period must be between 7 and 21.');
      }
      if (rsiOverbought < 60 || rsiOverbought > 80) {
        throw new Error('RSI overbought threshold must be between 60 and 80.');
      }
      if (macdFastPeriod < 8 || macdFastPeriod > 16) {
        throw new Error('MACD fast period must be between 8 and 16.');
      }
      if (macdSlowPeriod < 20 || macdSlowPeriod > 30) {
        throw new Error('MACD slow period must be between 20 and 30.');
      }
      if (macdSignalPeriod < 5 || macdSignalPeriod > 12) {
        throw new Error('MACD signal period must be between 5 and 12.');
      }
      if (macdFastPeriod >= macdSlowPeriod) {
        throw new Error(`MACD fast period (${macdFastPeriod}) must be less than slow period (${macdSlowPeriod}).`);
      }
    }

    // Clamp slippage between 0% and 0.5%
    const effectiveSlippagePercent = Math.max(0, Math.min(0.5, slippagePercent));
    const effectiveBrokerage = Math.max(0, brokeragePerTrade);
    const effectiveRegulatoryFeePercent = Math.max(0, regulatoryFeePercent);

    const closePrices = history.map((p) => p.close);
    const dates = history.map((p) => p.date);

    // Calculate dynamic indicators based on supplied parameters
    const smaFast = calculateSMA(closePrices, fastPeriod);
    const smaSlow = calculateSMA(closePrices, slowPeriod);
    const rsiValues = calculateRSI(closePrices, rsiPeriod);
    const macdValues = calculateMACD(closePrices, macdFastPeriod, macdSlowPeriod, macdSignalPeriod);
    const bollingerValues = calculateBollingerBands(closePrices, bollingerPeriod, bollingerStdDev);

    let capital = startingCapital;
    let position: {
      entryPrice: number;
      entryDate: string;
      entryReason: string;
      quantity: number;
      entrySlippagePaid: number;
      entryBrokeragePaid: number;
      entryRegulatoryFeePaid: number;
    } | null = null;
    const trades: BacktestTrade[] = [];
    const equityCurve: { date: string; equity: number; buyAndHold: number }[] = [];

    const initialPrice = closePrices[0];
    const initialSharesBuyAndHold = startingCapital / initialPrice;

    let peakEquity = startingCapital;
    let maxDrawdown = 0;
    let totalFrictionPaid = 0;

    for (let i = 0; i < history.length; i++) {
      const currentPrice = closePrices[i];
      const currentDate = dates[i];

      // Strategy signals check
      let buySignal = false;
      let sellSignal = false;
      let entrySignalReason = '';
      let exitSignalReason = '';

      if (strategy === 'SMA_CROSSOVER') {
        const currFast = smaFast[i];
        const currSlow = smaSlow[i];
        const prevFast = i > 0 ? smaFast[i - 1] : NaN;
        const prevSlow = i > 0 ? smaSlow[i - 1] : NaN;

        if (!isNaN(currFast) && !isNaN(currSlow)) {
          if (isNaN(prevFast) || isNaN(prevSlow)) {
            // First valid bar where both SMAs are computed
            if (currFast > currSlow) {
              buySignal = true;
              entrySignalReason = `SMA Golden Cross (${fastPeriod} SMA above ${slowPeriod} SMA at start)`;
            }
          } else {
            if (prevFast <= prevSlow && currFast > currSlow) {
              buySignal = true;
              entrySignalReason = `SMA Golden Cross (${fastPeriod} crossed above ${slowPeriod})`;
            } else if (prevFast >= prevSlow && currFast < currSlow) {
              sellSignal = true;
              exitSignalReason = `SMA Death Cross (${fastPeriod} crossed below ${slowPeriod})`;
            }
          }
        }
      } else if (strategy === 'RSI_STRATEGY') {
        const currRsi = rsiValues[i];
        const prevRsi = i > 0 ? rsiValues[i - 1] : NaN;

        if (!isNaN(currRsi)) {
          if (!isNaN(prevRsi)) {
            if (prevRsi <= rsiOversold && currRsi > rsiOversold) {
              buySignal = true;
              entrySignalReason = `RSI Oversold Bounce (${rsiPeriod} recovered above ${rsiOversold})`;
            } else if (prevRsi >= rsiOverbought && currRsi < rsiOverbought) {
              sellSignal = true;
              exitSignalReason = `RSI Overbought Pullback (${rsiPeriod} fell below ${rsiOverbought})`;
            }
          } else if (currRsi <= rsiOversold) {
            buySignal = true;
            entrySignalReason = `RSI Oversold Level (${rsiPeriod} at ${currRsi})`;
          }
        }
      } else if (strategy === 'MACD_STRATEGY') {
        const currMacd = macdValues.macdLine[i];
        const currSignal = macdValues.signalLine[i];
        const prevMacd = i > 0 ? macdValues.macdLine[i - 1] : NaN;
        const prevSignal = i > 0 ? macdValues.signalLine[i - 1] : NaN;

        if (!isNaN(currMacd) && !isNaN(currSignal)) {
          if (isNaN(prevMacd) || isNaN(prevSignal)) {
            if (currMacd > currSignal) {
              buySignal = true;
              entrySignalReason = `MACD Bullish Momentum (${macdFastPeriod}/${macdSlowPeriod}/${macdSignalPeriod} at start)`;
            }
          } else {
            if (prevMacd <= prevSignal && currMacd > currSignal) {
              buySignal = true;
              entrySignalReason = `MACD Bullish Crossover (${macdFastPeriod}/${macdSlowPeriod}/${macdSignalPeriod})`;
            } else if (prevMacd >= prevSignal && currMacd < currSignal) {
              sellSignal = true;
              exitSignalReason = `MACD Bearish Crossover (${macdFastPeriod}/${macdSlowPeriod}/${macdSignalPeriod})`;
            }
          }
        }
      } else if (strategy === 'BOLLINGER_STRATEGY') {
        const prevClose = i > 0 ? closePrices[i - 1] : NaN;
        const prevLower = i > 0 ? bollingerValues.lower[i - 1] : NaN;
        const prevUpper = i > 0 ? bollingerValues.upper[i - 1] : NaN;
        const currLower = bollingerValues.lower[i];
        const currUpper = bollingerValues.upper[i];

        if (!isNaN(currLower) && !isNaN(currUpper)) {
          if ((!isNaN(prevClose) && !isNaN(prevLower) && prevClose <= prevLower && currentPrice > currLower) || currentPrice <= currLower) {
            buySignal = true;
            entrySignalReason = `Bollinger Lower Band Touch (${bollingerPeriod}, ${bollingerStdDev}σ)`;
          } else if ((!isNaN(prevClose) && !isNaN(prevUpper) && prevClose >= prevUpper && currentPrice < currUpper) || currentPrice >= currUpper) {
            sellSignal = true;
            exitSignalReason = `Bollinger Upper Band Touch (${bollingerPeriod}, ${bollingerStdDev}σ)`;
          }
        }
      } else if (strategy === 'SMA_RSI_STRATEGY') {
        const currFast = smaFast[i];
        const currSlow = smaSlow[i];
        const currRsi = rsiValues[i];

        if (!isNaN(currFast) && !isNaN(currSlow) && !isNaN(currRsi)) {
          if (currFast > currSlow && currRsi < 60) {
            buySignal = true;
            entrySignalReason = `Simple SMA+RSI Confluence (SMA ${fastPeriod} > SMA ${slowPeriod} and RSI < 60)`;
          } else if (currFast < currSlow || currRsi > 70) {
            sellSignal = true;
            exitSignalReason = `Simple SMA+RSI Exit (SMA Bearish or RSI Overbought > 70)`;
          }
        }
      } else if (strategy === 'COMBINED_STRATEGY') {
        const currFast = smaFast[i];
        const prevFast = i > 0 ? smaFast[i - 1] : NaN;
        const currSlow = smaSlow[i];
        const currRsi = rsiValues[i];
        const currMacd = macdValues.macdLine[i];
        const currSignal = macdValues.signalLine[i];
        const prevMacd = i > 0 ? macdValues.macdLine[i - 1] : NaN;
        const prevSignal = i > 0 ? macdValues.signalLine[i - 1] : NaN;
        const currMacdHist = macdValues.histogram[i];

        if (!isNaN(currFast) && !isNaN(currSlow) && !isNaN(currRsi) && !isNaN(currMacd) && !isNaN(currSignal)) {
          // Improvement #5: Fast-SMA Slope Confirmation Filter
          const isFastSmaRising = !isNaN(prevFast) && currFast > prevFast;

          if (currFast > currSlow && isFastSmaRising && currRsi < 55 && currMacdHist > 0) {
            buySignal = true;
            entrySignalReason = 'Multi-Indicator Confluence (SMA Trend + Safe RSI + Positive MACD Hist)';
          } else if (currFast < currSlow || currMacdHist < 0) {
            sellSignal = true;
            exitSignalReason = 'Multi-Indicator Trend Reversal (SMA Fast < Slow or MACD Bearish)';
          }
        }
      }

      // Execute Trades with realistic friction
      if (buySignal && !position) {
        // Effective entry price including slippage on BUY (buying higher due to slippage)
        const slippageMultiplier = 1 + effectiveSlippagePercent / 100;
        const effectiveEntryPrice = Number((currentPrice * slippageMultiplier).toFixed(2));
        
        // Calculate max shares taking brokerage and regulatory fees into account
        const availableForShares = Math.max(0, capital - effectiveBrokerage);
        const perShareCost = effectiveEntryPrice * (1 + effectiveRegulatoryFeePercent / 100);
        const quantity = Math.floor(availableForShares / perShareCost);

        if (quantity > 0) {
          const rawEntryCost = quantity * currentPrice;
          const actualEntryCost = quantity * effectiveEntryPrice;
          const entrySlippagePaid = Number((actualEntryCost - rawEntryCost).toFixed(2));
          const entryRegulatoryFeePaid = Number(((actualEntryCost * effectiveRegulatoryFeePercent) / 100).toFixed(2));
          const entryBrokeragePaid = effectiveBrokerage;

          const totalEntryCashOut = actualEntryCost + entryBrokeragePaid + entryRegulatoryFeePaid;

          if (capital >= totalEntryCashOut) {
            position = {
              entryPrice: effectiveEntryPrice,
              entryDate: currentDate,
              entryReason: entrySignalReason,
              quantity,
              entrySlippagePaid,
              entryBrokeragePaid,
              entryRegulatoryFeePaid,
            };
            capital -= totalEntryCashOut;
            totalFrictionPaid += (entrySlippagePaid + entryBrokeragePaid + entryRegulatoryFeePaid);
          }
        }
      } else if (sellSignal && position) {
        // Effective exit price including slippage on SELL (selling lower due to slippage)
        const slippageMultiplier = 1 - effectiveSlippagePercent / 100;
        const effectiveExitPrice = Number((currentPrice * slippageMultiplier).toFixed(2));
        
        const rawExitRevenue = position.quantity * currentPrice;
        const actualExitRevenue = position.quantity * effectiveExitPrice;
        const exitSlippagePaid = Number((rawExitRevenue - actualExitRevenue).toFixed(2));
        const exitRegulatoryFeePaid = Number(((actualExitRevenue * effectiveRegulatoryFeePercent) / 100).toFixed(2));
        const exitBrokeragePaid = effectiveBrokerage;

        const totalExitFriction = exitSlippagePaid + exitBrokeragePaid + exitRegulatoryFeePaid;
        const netExitCashIn = actualExitRevenue - exitBrokeragePaid - exitRegulatoryFeePaid;

        capital += netExitCashIn;
        totalFrictionPaid += totalExitFriction;

        // Trade P/L strictly follows standard (exitPrice - entryPrice) * quantity - total transaction friction
        const tradeSlippagePaid = Number((position.entrySlippagePaid + exitSlippagePaid).toFixed(2));
        const tradeBrokeragePaid = Number((position.entryBrokeragePaid + exitBrokeragePaid).toFixed(2));
        const tradeRegulatoryPaid = Number((position.entryRegulatoryFeePaid + exitRegulatoryFeePaid).toFixed(2));
        const tradeTotalFriction = Number((tradeSlippagePaid + tradeBrokeragePaid + tradeRegulatoryPaid).toFixed(2));

        const grossPnl = Number(((effectiveExitPrice - position.entryPrice) * position.quantity).toFixed(2));
        const netPnl = Number((grossPnl - (position.entryBrokeragePaid + exitBrokeragePaid + position.entryRegulatoryFeePaid + exitRegulatoryFeePaid)).toFixed(2));
        const investedBasis = position.quantity * position.entryPrice + position.entryBrokeragePaid + position.entryRegulatoryFeePaid;
        const pnlPercent = investedBasis > 0 ? Number(((netPnl / investedBasis) * 100).toFixed(2)) : 0;
        
        const holdingDays = Math.max(
          1,
          Math.round(
            (new Date(currentDate).getTime() - new Date(position.entryDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) || 1
        );
        const status: 'WIN' | 'LOSS' | 'BREAKEVEN' =
          netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN';

        trades.push({
          id: `BT_${Date.now()}_${i}`,
          type: 'BUY',
          entryDate: position.entryDate,
          entryPrice: position.entryPrice,
          entryReason: position.entryReason,
          exitDate: currentDate,
          exitPrice: effectiveExitPrice,
          exitReason: exitSignalReason,
          quantity: position.quantity,
          holdingDays,
          grossPnl,
          pnl: netPnl,
          pnlPercent,
          reason: exitSignalReason,
          slippagePaid: tradeSlippagePaid,
          brokeragePaid: tradeBrokeragePaid,
          regulatoryFeesPaid: tradeRegulatoryPaid,
          totalFrictionPaid: tradeTotalFriction,
          status,
        });

        position = null;
      }

      // Calculate current equity
      const currentEquity =
        capital + (position ? position.quantity * currentPrice : 0);

      const buyAndHoldEquity = initialSharesBuyAndHold * currentPrice;

      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const drawdown = peakEquity - currentEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      equityCurve.push({
        date: currentDate,
        equity: Number(currentEquity.toFixed(2)),
        buyAndHold: Number(buyAndHoldEquity.toFixed(2)),
      });
    }

    // Force close open position at end of backtest period
    if (position) {
      const lastPrice = closePrices[closePrices.length - 1];
      const lastDate = dates[dates.length - 1];
      
      const slippageMultiplier = 1 - effectiveSlippagePercent / 100;
      const effectiveExitPrice = Number((lastPrice * slippageMultiplier).toFixed(2));
      
      const rawExitRevenue = position.quantity * lastPrice;
      const actualExitRevenue = position.quantity * effectiveExitPrice;
      const exitSlippagePaid = Number((rawExitRevenue - actualExitRevenue).toFixed(2));
      const exitRegulatoryFeePaid = Number(((actualExitRevenue * effectiveRegulatoryFeePercent) / 100).toFixed(2));
      const exitBrokeragePaid = effectiveBrokerage;

      const totalExitFriction = exitSlippagePaid + exitBrokeragePaid + exitRegulatoryFeePaid;
      const netExitCashIn = actualExitRevenue - exitBrokeragePaid - exitRegulatoryFeePaid;

      capital += netExitCashIn;
      totalFrictionPaid += totalExitFriction;

      const tradeSlippagePaid = Number((position.entrySlippagePaid + exitSlippagePaid).toFixed(2));
      const tradeBrokeragePaid = Number((position.entryBrokeragePaid + exitBrokeragePaid).toFixed(2));
      const tradeRegulatoryPaid = Number((position.entryRegulatoryFeePaid + exitRegulatoryFeePaid).toFixed(2));
      const tradeTotalFriction = Number((tradeSlippagePaid + tradeBrokeragePaid + tradeRegulatoryPaid).toFixed(2));

      const grossPnl = Number(((effectiveExitPrice - position.entryPrice) * position.quantity).toFixed(2));
      const netPnl = Number((grossPnl - (position.entryBrokeragePaid + exitBrokeragePaid + position.entryRegulatoryFeePaid + exitRegulatoryFeePaid)).toFixed(2));
      const investedBasis = position.quantity * position.entryPrice + position.entryBrokeragePaid + position.entryRegulatoryFeePaid;
      const pnlPercent = investedBasis > 0 ? Number(((netPnl / investedBasis) * 100).toFixed(2)) : 0;
      
      const holdingDays = Math.max(
        1,
        Math.round(
          (new Date(lastDate).getTime() - new Date(position.entryDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) || 1
      );
      const status: 'WIN' | 'LOSS' | 'BREAKEVEN' =
        netPnl > 0 ? 'WIN' : netPnl < 0 ? 'LOSS' : 'BREAKEVEN';

      if (equityCurve.length > 0) {
        equityCurve[equityCurve.length - 1].equity = Number(capital.toFixed(2));
      }

      trades.push({
        id: `BT_FINAL_${Date.now()}`,
        type: 'BUY',
        entryDate: position.entryDate,
        entryPrice: position.entryPrice,
        entryReason: position.entryReason,
        exitDate: lastDate,
        exitPrice: effectiveExitPrice,
        exitReason: 'End of backtest period',
        quantity: position.quantity,
        holdingDays,
        grossPnl,
        pnl: netPnl,
        pnlPercent,
        reason: 'End of backtest period',
        slippagePaid: tradeSlippagePaid,
        brokeragePaid: tradeBrokeragePaid,
        regulatoryFeesPaid: tradeRegulatoryPaid,
        totalFrictionPaid: tradeTotalFriction,
        status,
      });
    }

    const finalCapital = Number(capital.toFixed(2));
    const totalReturn = Number((finalCapital - startingCapital).toFixed(2));
    const totalReturnPercent = Number(((totalReturn / startingCapital) * 100).toFixed(2));

    const finalBuyAndHoldPrice = closePrices[closePrices.length - 1];
    const buyAndHoldReturnPercent = Number(
      (((finalBuyAndHoldPrice - initialPrice) / initialPrice) * 100).toFixed(2)
    );

    const winningTradesList = trades.filter((t) => t.pnl > 0);
    const losingTradesList = trades.filter((t) => t.pnl < 0);
    const breakevenTradesList = trades.filter((t) => t.pnl === 0);

    const totalTrades = trades.length;
    const winningTrades = winningTradesList.length;
    const losingTrades = losingTradesList.length;
    const breakevenTrades = breakevenTradesList.length;

    const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
    const lossRate = totalTrades > 0 ? Number(((losingTrades / totalTrades) * 100).toFixed(1)) : 0;
    const breakevenRate = totalTrades > 0 ? Number(((breakevenTrades / totalTrades) * 100).toFixed(1)) : 0;

    // Gross P/L before friction
    const grossProfit = Number(trades.filter((t) => t.grossPnl > 0).reduce((acc, t) => acc + t.grossPnl, 0).toFixed(2));
    const grossLoss = Number(Math.abs(trades.filter((t) => t.grossPnl < 0).reduce((acc, t) => acc + t.grossPnl, 0)).toFixed(2));
    const totalGrossPnl = Number((grossProfit - grossLoss).toFixed(2));

    // Net winning / losing sums for profit factor and averages
    const netWinSum = winningTradesList.reduce((acc, t) => acc + t.pnl, 0);
    const netLossSum = Math.abs(losingTradesList.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = netLossSum > 0 ? Number((netWinSum / netLossSum).toFixed(2)) : netWinSum > 0 ? 99.9 : 0;

    const avgWinningTrade = winningTrades > 0 ? Number((netWinSum / winningTrades).toFixed(2)) : 0;
    const avgLosingTrade = losingTrades > 0 ? Number((losingTradesList.reduce((acc, t) => acc + t.pnl, 0) / losingTrades).toFixed(2)) : 0;

    // Largest win / largest loss
    const sortedByNetPnl = [...trades].sort((a, b) => b.pnl - a.pnl);
    const largestWinTrade = sortedByNetPnl.length > 0 && sortedByNetPnl[0].pnl > 0 ? sortedByNetPnl[0] : null;
    const largestWin = largestWinTrade ? largestWinTrade.pnl : 0;
    const largestLossTrade = sortedByNetPnl.length > 0 && sortedByNetPnl[sortedByNetPnl.length - 1].pnl < 0 ? sortedByNetPnl[sortedByNetPnl.length - 1] : null;
    const largestLoss = largestLossTrade ? largestLossTrade.pnl : 0;

    // Holding duration analytics
    const totalHoldingDays = trades.reduce((acc, t) => acc + t.holdingDays, 0);
    const avgHoldingDays = totalTrades > 0 ? Number((totalHoldingDays / totalTrades).toFixed(1)) : 0;
    const sortedByHolding = [...trades].sort((a, b) => b.holdingDays - a.holdingDays);
    const longestHoldingTrade = sortedByHolding.length > 0 ? sortedByHolding[0] : null;
    const longestHoldingDays = longestHoldingTrade ? longestHoldingTrade.holdingDays : 0;

    const totalPnlPercentSum = trades.reduce((acc, t) => acc + t.pnlPercent, 0);
    const avgTradeReturn = totalTrades > 0 ? Number((totalPnlPercentSum / totalTrades).toFixed(2)) : 0;

    const maxDrawdownPercent = peakEquity > 0 ? Number(((maxDrawdown / peakEquity) * 100).toFixed(2)) : 0;

    let strategyNameFormatted = `SMA Crossover (${fastPeriod}/${slowPeriod})`;
    if (strategy === 'RSI_STRATEGY') strategyNameFormatted = `RSI Reversal (${rsiPeriod}, ${rsiOversold}/${rsiOverbought})`;
    if (strategy === 'MACD_STRATEGY') strategyNameFormatted = `MACD Crossover (${macdFastPeriod}/${macdSlowPeriod}/${macdSignalPeriod})`;
    if (strategy === 'BOLLINGER_STRATEGY') strategyNameFormatted = `Bollinger Bands (${bollingerPeriod}, ${bollingerStdDev}σ)`;
    if (strategy === 'COMBINED_STRATEGY') strategyNameFormatted = `Multi-Indicator Strategy (SMA ${fastPeriod}/${slowPeriod} + RSI ${rsiPeriod} + MACD ${macdFastPeriod}/${macdSlowPeriod}/${macdSignalPeriod})`;

    return {
      symbol,
      strategyName: strategyNameFormatted,
      initialCapital: startingCapital,
      finalCapital,
      totalReturn,
      totalReturnPercent,
      buyAndHoldReturnPercent,
      totalTrades,
      winningTrades,
      losingTrades,
      breakevenTrades,
      winRate,
      lossRate,
      breakevenRate,
      grossProfit,
      grossLoss,
      totalGrossPnl,
      avgWinningTrade,
      avgLosingTrade,
      largestWin,
      largestLoss,
      largestWinTrade,
      largestLossTrade,
      avgHoldingDays,
      longestHoldingDays,
      longestHoldingTrade,
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxDrawdownPercent,
      profitFactor,
      avgTradeReturn,
      totalFrictionPaid: Number(totalFrictionPaid.toFixed(2)),
      slippagePercentUsed: effectiveSlippagePercent,
      brokeragePerTradeUsed: effectiveBrokerage,
      regulatoryFeePercentUsed: effectiveRegulatoryFeePercent,
      equityCurve,
      trades,
    };
  }
}

export const backtestingService = new BacktestingService();
