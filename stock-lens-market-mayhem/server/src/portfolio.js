'use strict';

const config = require('./config');
const { DEFAULT_LEAGUE_ID, getPortfolio, getPositions, addAudit } = require('./dataStore');
const { getInstrument, getQuote } = require('./marketData');
const { uid, nowIso, tradingDay, roundMoney, round4, clamp } = require('./utils');

function uniqueDates(items, field = 'createdAt') {
  return Array.from(new Set(items.map((item) => String(item[field]).slice(0, 10))));
}

async function valuePositions(positions) {
  const valued = [];
  for (const position of positions) {
    const quote = await getQuote(position.instrumentId);
    valued.push({
      ...position,
      quote,
      marketValue: roundMoney(position.quantity * quote.price),
      unrealisedPnl: roundMoney((quote.price - position.avgPrice) * position.quantity)
    });
  }
  return valued;
}

async function calculatePortfolioValue(data, userId, leagueId = DEFAULT_LEAGUE_ID) {
  const portfolio = getPortfolio(data, userId, leagueId);
  if (!portfolio) throw new Error('Portfolio not found');
  const positions = getPositions(data, userId, leagueId);
  const valuedPositions = await valuePositions(positions);
  const positionsValue = valuedPositions.reduce((sum, position) => sum + position.marketValue, 0);
  const portfolioValue = roundMoney(portfolio.cash + positionsValue);
  return {
    portfolio,
    cash: roundMoney(portfolio.cash),
    positions: valuedPositions,
    positionsValue: roundMoney(positionsValue),
    portfolioValue,
    pnl: roundMoney(portfolioValue - portfolio.startingBalance),
    pnlPercent: round4(((portfolioValue - portfolio.startingBalance) / portfolio.startingBalance) * 100)
  };
}

function tradesToday(data, userId, leagueId = DEFAULT_LEAGUE_ID, date = tradingDay()) {
  return data.trades.filter((trade) => trade.userId === userId && trade.leagueId === leagueId && trade.tradeDay === date);
}

function assertDailyTradeAvailable(data, userId, leagueId = DEFAULT_LEAGUE_ID) {
  const count = tradesToday(data, userId, leagueId).length;
  if (count >= config.dailyTradeLimit) {
    const error = new Error(`Daily trade already used. Limit: ${config.dailyTradeLimit}`);
    error.statusCode = 409;
    throw error;
  }
}

function getOrCreatePosition(data, userId, instrumentId, leagueId = DEFAULT_LEAGUE_ID) {
  let position = data.positions.find((item) => item.userId === userId && item.leagueId === leagueId && item.instrumentId === instrumentId);
  if (!position) {
    position = {
      id: uid('pos'),
      userId,
      leagueId,
      instrumentId,
      quantity: 0,
      avgPrice: 0,
      openedAt: nowIso(),
      updatedAt: nowIso()
    };
    data.positions.push(position);
  }
  return position;
}

function updateAverage(position, deltaQty, price) {
  const oldQty = Number(position.quantity || 0);
  const newQty = oldQty + deltaQty;
  if (Math.abs(newQty) < 0.000001) {
    position.quantity = 0;
    position.avgPrice = 0;
    return;
  }
  // If adding to same direction, recalc weighted average. If flipping direction, reset average at current price.
  if (oldQty === 0 || Math.sign(oldQty) !== Math.sign(deltaQty) || Math.sign(oldQty) !== Math.sign(newQty)) {
    position.avgPrice = price;
  } else {
    const oldCost = Math.abs(oldQty) * Number(position.avgPrice || price);
    const newCost = Math.abs(deltaQty) * price;
    position.avgPrice = round4((oldCost + newCost) / (Math.abs(oldQty) + Math.abs(deltaQty)));
  }
  position.quantity = round4(newQty);
}

async function executeTrade(data, user, input) {
  const leagueId = input.leagueId || DEFAULT_LEAGUE_ID;
  const instrument = getInstrument(input.instrumentId || input.symbol);
  if (!instrument) {
    const error = new Error('Unknown instrument');
    error.statusCode = 400;
    throw error;
  }
  const side = String(input.side || '').toUpperCase();
  if (!['BUY', 'SELL', 'LONG', 'SHORT', 'CLOSE'].includes(side)) {
    const error = new Error('Invalid trade side');
    error.statusCode = 400;
    throw error;
  }
  assertDailyTradeAvailable(data, user.id, leagueId);

  const notional = Number(input.notional || input.amount || 0);
  if (side !== 'CLOSE' && (!Number.isFinite(notional) || notional <= 0)) {
    const error = new Error('Trade notional must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  const portfolio = getPortfolio(data, user.id, leagueId);
  const quote = await getQuote(instrument.id);
  const position = getOrCreatePosition(data, user.id, instrument.id, leagueId);
  const beforeValue = await calculatePortfolioValue(data, user.id, leagueId);

  let quantityDelta = 0;
  let cashDelta = 0;
  let filledNotional = notional;
  const maxSingleTradeNotional = Math.max(25, beforeValue.portfolioValue * 0.95);

  if (side === 'BUY' || side === 'LONG') {
    if (notional > portfolio.cash + 0.0001) {
      const error = new Error('Insufficient virtual cash for this trade');
      error.statusCode = 400;
      throw error;
    }
    quantityDelta = round4(notional / quote.price);
    cashDelta = -notional;
    updateAverage(position, quantityDelta, quote.price);
  }

  if (side === 'SELL') {
    if (position.quantity <= 0) {
      const error = new Error('No long position available to sell');
      error.statusCode = 400;
      throw error;
    }
    const requestedQty = notional / quote.price;
    const sellQty = Math.min(position.quantity, requestedQty);
    filledNotional = roundMoney(sellQty * quote.price);
    quantityDelta = -round4(sellQty);
    cashDelta = filledNotional;
    updateAverage(position, quantityDelta, quote.price);
  }

  if (side === 'SHORT') {
    if (notional > maxSingleTradeNotional) {
      const error = new Error(`Short/futures-style positions are capped at ${roundMoney(maxSingleTradeNotional)} virtual dollars for risk control`);
      error.statusCode = 400;
      throw error;
    }
    quantityDelta = -round4(notional / quote.price);
    cashDelta = notional;
    updateAverage(position, quantityDelta, quote.price);
  }

  if (side === 'CLOSE') {
    if (Math.abs(position.quantity) < 0.000001) {
      const error = new Error('No open position to close');
      error.statusCode = 400;
      throw error;
    }
    const closeQty = -position.quantity;
    filledNotional = roundMoney(Math.abs(position.quantity) * quote.price);
    quantityDelta = round4(closeQty);
    cashDelta = roundMoney(position.quantity * quote.price); // long adds cash, short subtracts cash
    updateAverage(position, quantityDelta, quote.price);
  }

  portfolio.cash = roundMoney(portfolio.cash + cashDelta);
  portfolio.updatedAt = nowIso();
  position.updatedAt = nowIso();

  const trade = {
    id: uid('trade'),
    userId: user.id,
    leagueId,
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    side,
    notional: roundMoney(filledNotional),
    quantityDelta,
    price: quote.price,
    priceSource: quote.source,
    priceSourceLabel: quote.sourceLabel,
    tradeDay: tradingDay(),
    createdAt: nowIso()
  };
  data.trades.push(trade);
  data.priceSnapshots.push({
    id: uid('price'),
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    price: quote.price,
    source: quote.source,
    sourceLabel: quote.sourceLabel,
    delayed: quote.delayed,
    asOf: quote.asOf,
    capturedAt: nowIso(),
    reason: `TRADE:${trade.id}`
  });
  addAudit(data, 'TRADE_EXECUTED', user.id, { tradeId: trade.id, side, instrumentId: instrument.id, notional: filledNotional });

  const afterValue = await calculatePortfolioValue(data, user.id, leagueId);
  return { trade, before: beforeValue, after: afterValue, dailyTradesRemaining: Math.max(0, config.dailyTradeLimit - tradesToday(data, user.id, leagueId).length) };
}

async function userMetrics(data, userId, leagueId = DEFAULT_LEAGUE_ID) {
  const value = await calculatePortfolioValue(data, userId, leagueId);
  const userTrades = data.trades.filter((trade) => trade.userId === userId && trade.leagueId === leagueId);
  const snapshots = data.dailyPortfolioSnapshots.filter((snapshot) => snapshot.userId === userId && snapshot.leagueId === leagueId);
  const gains = snapshots.filter((snapshot) => snapshot.dailyPnl > 0);
  const losses = snapshots.filter((snapshot) => snapshot.dailyPnl < 0);
  const biggestGain = snapshots.length ? Math.max(...snapshots.map((snapshot) => snapshot.dailyPnl)) : 0;
  const biggestLoss = snapshots.length ? Math.min(...snapshots.map((snapshot) => snapshot.dailyPnl)) : 0;
  const challengeWins = data.challenges.filter((challenge) => challenge.winnerId === userId).length;
  const challengeLosses = data.challenges.filter((challenge) => challenge.status === 'complete' && challenge.winnerId && challenge.winnerId !== userId && [challenge.fromUserId, challenge.toUserId].includes(userId)).length;
  return {
    ...value,
    stats: {
      daysTraded: uniqueDates(userTrades, 'createdAt').length,
      daysGained: gains.length,
      daysLost: losses.length,
      winRate: snapshots.length ? round4((gains.length / snapshots.length) * 100) : 0,
      biggestGain: roundMoney(biggestGain),
      biggestLoss: roundMoney(biggestLoss),
      tradesUsedToday: tradesToday(data, userId, leagueId).length,
      dailyTradesRemaining: Math.max(0, config.dailyTradeLimit - tradesToday(data, userId, leagueId).length),
      challengeWins,
      challengeLosses
    }
  };
}

async function leaderboard(data, leagueId = DEFAULT_LEAGUE_ID) {
  const members = data.memberships.filter((member) => member.leagueId === leagueId);
  const rows = [];
  for (const member of members) {
    const user = data.users.find((item) => item.id === member.userId);
    if (!user) continue;
    const metrics = await userMetrics(data, user.id, leagueId);
    rows.push({
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      portfolioValue: metrics.portfolioValue,
      pnl: metrics.pnl,
      pnlPercent: metrics.pnlPercent,
      daysTraded: metrics.stats.daysTraded,
      daysGained: metrics.stats.daysGained,
      daysLost: metrics.stats.daysLost,
      biggestGain: metrics.stats.biggestGain,
      biggestLoss: metrics.stats.biggestLoss,
      challengeWins: metrics.stats.challengeWins,
      challengeLosses: metrics.stats.challengeLosses
    });
  }
  rows.sort((a, b) => b.portfolioValue - a.portfolioValue);
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

async function settleToday(data, leagueId = DEFAULT_LEAGUE_ID) {
  const today = tradingDay();
  const members = data.memberships.filter((member) => member.leagueId === leagueId);
  const created = [];
  for (const member of members) {
    const existing = data.dailyPortfolioSnapshots.find((snapshot) => snapshot.userId === member.userId && snapshot.leagueId === leagueId && snapshot.day === today);
    const value = await calculatePortfolioValue(data, member.userId, leagueId);
    const previousSnapshots = data.dailyPortfolioSnapshots
      .filter((snapshot) => snapshot.userId === member.userId && snapshot.leagueId === leagueId)
      .sort((a, b) => a.day.localeCompare(b.day));
    const previousValue = previousSnapshots.length ? previousSnapshots[previousSnapshots.length - 1].portfolioValue : config.startingBalance;
    const payload = {
      id: existing ? existing.id : uid('snap'),
      userId: member.userId,
      leagueId,
      day: today,
      portfolioValue: value.portfolioValue,
      dailyPnl: roundMoney(value.portfolioValue - previousValue),
      dailyPnlPercent: previousValue ? round4(((value.portfolioValue - previousValue) / previousValue) * 100) : 0,
      createdAt: existing ? existing.createdAt : nowIso(),
      updatedAt: nowIso()
    };
    if (existing) Object.assign(existing, payload);
    else data.dailyPortfolioSnapshots.push(payload);
    created.push(payload);
  }
  addAudit(data, 'DAILY_SETTLEMENT', 'system', { day: today, count: created.length });
  return created;
}

module.exports = {
  valuePositions,
  calculatePortfolioValue,
  tradesToday,
  executeTrade,
  userMetrics,
  leaderboard,
  settleToday
};
