'use strict';

const config = require('./config');
const { hashNumber, clamp, roundMoney, round4, tradingDay, nowIso } = require('./utils');

const INSTRUMENTS = [
  { id: 'AAPL', symbol: 'AAPL', name: 'Apple', assetClass: 'US Stock', market: 'US', sector: 'Technology', currency: 'USD', yahooSymbol: 'AAPL' },
  { id: 'NVDA', symbol: 'NVDA', name: 'NVIDIA', assetClass: 'US Stock', market: 'US', sector: 'Semiconductors', currency: 'USD', yahooSymbol: 'NVDA' },
  { id: 'TSLA', symbol: 'TSLA', name: 'Tesla', assetClass: 'US Stock', market: 'US', sector: 'EV / Energy', currency: 'USD', yahooSymbol: 'TSLA' },
  { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft', assetClass: 'US Stock', market: 'US', sector: 'Software', currency: 'USD', yahooSymbol: 'MSFT' },
  { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet', assetClass: 'US Stock', market: 'US', sector: 'Internet', currency: 'USD', yahooSymbol: 'GOOGL' },
  { id: 'AMD', symbol: 'AMD', name: 'AMD', assetClass: 'US Stock', market: 'US', sector: 'Semiconductors', currency: 'USD', yahooSymbol: 'AMD' },
  { id: 'PLTR', symbol: 'PLTR', name: 'Palantir', assetClass: 'US Stock', market: 'US', sector: 'Data / AI', currency: 'USD', yahooSymbol: 'PLTR' },
  { id: 'RR.L', symbol: 'RR.L', name: 'Rolls-Royce Holdings', assetClass: 'UK Stock', market: 'FTSE', sector: 'Aerospace', currency: 'GBP', yahooSymbol: 'RR.L' },
  { id: 'AZN.L', symbol: 'AZN.L', name: 'AstraZeneca', assetClass: 'UK Stock', market: 'FTSE', sector: 'Pharma', currency: 'GBP', yahooSymbol: 'AZN.L' },
  { id: 'SHEL.L', symbol: 'SHEL.L', name: 'Shell', assetClass: 'UK Stock', market: 'FTSE', sector: 'Energy', currency: 'GBP', yahooSymbol: 'SHEL.L' },
  { id: 'BP.L', symbol: 'BP.L', name: 'BP', assetClass: 'UK Stock', market: 'FTSE', sector: 'Energy', currency: 'GBP', yahooSymbol: 'BP.L' },
  { id: 'BARC.L', symbol: 'BARC.L', name: 'Barclays', assetClass: 'UK Stock', market: 'FTSE', sector: 'Banking', currency: 'GBP', yahooSymbol: 'BARC.L' },
  { id: 'LSEG.L', symbol: 'LSEG.L', name: 'London Stock Exchange Group', assetClass: 'UK Stock', market: 'FTSE', sector: 'Market Infrastructure', currency: 'GBP', yahooSymbol: 'LSEG.L' },
  { id: 'VOD.L', symbol: 'VOD.L', name: 'Vodafone', assetClass: 'UK Stock', market: 'FTSE', sector: 'Telecoms', currency: 'GBP', yahooSymbol: 'VOD.L' },
  { id: 'FTSE100', symbol: '^FTSE', name: 'FTSE 100 Index', assetClass: 'Index', market: 'UK', sector: 'Index', currency: 'GBP', yahooSymbol: '^FTSE' },
  { id: 'SP500', symbol: '^GSPC', name: 'S&P 500 Index', assetClass: 'Index', market: 'US', sector: 'Index', currency: 'USD', yahooSymbol: '^GSPC' },
  { id: 'NASDAQ100', symbol: '^NDX', name: 'Nasdaq 100 Index', assetClass: 'Index', market: 'US', sector: 'Index', currency: 'USD', yahooSymbol: '^NDX' },
  { id: 'DOW', symbol: '^DJI', name: 'Dow Jones Industrial Average', assetClass: 'Index', market: 'US', sector: 'Index', currency: 'USD', yahooSymbol: '^DJI' },
  { id: 'GOLD', symbol: 'GC=F', name: 'Gold Futures', assetClass: 'Commodity Future', market: 'COMEX', sector: 'Metals', currency: 'USD', yahooSymbol: 'GC=F' },
  { id: 'SILVER', symbol: 'SI=F', name: 'Silver Futures', assetClass: 'Commodity Future', market: 'COMEX', sector: 'Metals', currency: 'USD', yahooSymbol: 'SI=F' },
  { id: 'OIL', symbol: 'CL=F', name: 'WTI Crude Oil Futures', assetClass: 'Commodity Future', market: 'NYMEX', sector: 'Energy', currency: 'USD', yahooSymbol: 'CL=F' },
  { id: 'NATGAS', symbol: 'NG=F', name: 'Natural Gas Futures', assetClass: 'Commodity Future', market: 'NYMEX', sector: 'Energy', currency: 'USD', yahooSymbol: 'NG=F' },
  { id: 'COPPER', symbol: 'HG=F', name: 'Copper Futures', assetClass: 'Commodity Future', market: 'COMEX', sector: 'Metals', currency: 'USD', yahooSymbol: 'HG=F' },
  { id: 'WHEAT', symbol: 'ZW=F', name: 'Wheat Futures', assetClass: 'Commodity Future', market: 'CBOT', sector: 'Agriculture', currency: 'USD', yahooSymbol: 'ZW=F' },
  { id: 'CORN', symbol: 'ZC=F', name: 'Corn Futures', assetClass: 'Commodity Future', market: 'CBOT', sector: 'Agriculture', currency: 'USD', yahooSymbol: 'ZC=F' }
];

const quoteCache = new Map();

function getInstrument(idOrSymbol) {
  return INSTRUMENTS.find((instrument) => instrument.id === idOrSymbol || instrument.symbol === idOrSymbol || instrument.yahooSymbol === idOrSymbol);
}

function basePriceFor(instrument) {
  const bases = {
    'AAPL': 200, 'NVDA': 900, 'TSLA': 220, 'MSFT': 430, 'GOOGL': 170, 'AMD': 160, 'PLTR': 35,
    'RR.L': 420, 'AZN.L': 11800, 'SHEL.L': 2850, 'BP.L': 480, 'BARC.L': 210, 'LSEG.L': 9400, 'VOD.L': 72,
    'FTSE100': 8200, 'SP500': 5200, 'NASDAQ100': 18500, 'DOW': 39000,
    'GOLD': 2350, 'SILVER': 29, 'OIL': 82, 'NATGAS': 2.7, 'COPPER': 4.7, 'WHEAT': 610, 'CORN': 460
  };
  return bases[instrument.id] || (hashNumber(instrument.id) % 500) + 50;
}

function demoQuote(instrument, date = new Date()) {
  const day = tradingDay(date);
  const fiveMinuteBucket = Math.floor(date.getTime() / (5 * 60 * 1000));
  const seed = hashNumber(`${instrument.id}:${day}`);
  const bucketSeed = hashNumber(`${instrument.id}:${fiveMinuteBucket}`);
  const base = basePriceFor(instrument);
  const drift = ((seed % 1401) - 700) / 10000; // -7% to +7% daily drift envelope
  const noise = ((bucketSeed % 241) - 120) / 10000; // intraday movement
  const price = base * (1 + drift + noise);
  const previousClose = base * (1 + (((hashNumber(`${instrument.id}:prev:${day}`) % 801) - 400) / 10000));
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    name: instrument.name,
    price: roundMoney(price),
    previousClose: roundMoney(previousClose),
    change: roundMoney(change),
    changePercent: round4(changePercent),
    currency: instrument.currency,
    source: 'demo-deterministic',
    sourceLabel: 'Demo pricing - replace with licensed real-time data provider before public financial-market launch',
    delayed: true,
    asOf: nowIso()
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function yahooQuote(instrument) {
  const symbol = encodeURIComponent(instrument.yahooSymbol || instrument.symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
  const response = await fetchWithTimeout(url, { headers: { 'accept': 'application/json', 'user-agent': 'Stock-LENS/1.0' } });
  if (!response.ok) throw new Error(`Yahoo quote failed: ${response.status}`);
  const body = await response.json();
  const result = body && body.chart && body.chart.result && body.chart.result[0];
  const meta = result && result.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') throw new Error('Yahoo quote missing price');
  const price = meta.regularMarketPrice;
  const previousClose = meta.previousClose || meta.chartPreviousClose || price;
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    name: instrument.name,
    price: roundMoney(price),
    previousClose: roundMoney(previousClose),
    change: roundMoney(change),
    changePercent: round4(changePercent),
    currency: instrument.currency,
    source: 'yahoo-public-chart',
    sourceLabel: 'Public quote endpoint for testing only - use licensed market data for production',
    delayed: Boolean(meta.exchangeTimezoneName && meta.currentTradingPeriod === undefined),
    asOf: nowIso()
  };
}

async function licensedQuote(instrument) {
  if (!config.marketDataBaseUrl || !config.marketDataApiKey) {
    throw new Error('Licensed provider selected but MARKET_DATA_BASE_URL / MARKET_DATA_API_KEY are not configured');
  }
  const url = new URL(config.marketDataBaseUrl.replace(/\/$/, '') + '/quote');
  url.searchParams.set('symbol', instrument.symbol);
  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${config.marketDataApiKey}`
    }
  });
  if (!response.ok) throw new Error(`Licensed provider quote failed: ${response.status}`);
  const body = await response.json();
  if (typeof body.price !== 'number') throw new Error('Licensed provider missing numeric price');
  const previousClose = Number(body.previousClose || body.price);
  const price = Number(body.price);
  const change = price - previousClose;
  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    name: instrument.name,
    price: roundMoney(price),
    previousClose: roundMoney(previousClose),
    change: roundMoney(change),
    changePercent: previousClose ? round4((change / previousClose) * 100) : 0,
    currency: body.currency || instrument.currency,
    source: body.source || 'licensed-provider',
    sourceLabel: body.sourceLabel || 'Licensed market data provider',
    delayed: Boolean(body.delayed),
    asOf: body.asOf || nowIso()
  };
}

async function getQuote(idOrSymbol, options = {}) {
  const instrument = getInstrument(idOrSymbol);
  if (!instrument) throw new Error(`Unknown instrument: ${idOrSymbol}`);
  const provider = options.provider || config.marketProvider;
  const cacheKey = `${provider}:${instrument.id}`;
  const cached = quoteCache.get(cacheKey);
  const cacheMs = Math.max(0, config.quoteCacheSeconds) * 1000;
  if (cacheMs && cached && Date.now() - cached.cachedAt < cacheMs) return cached.quote;

  let quote;
  if (provider === 'yahoo') {
    quote = await yahooQuote(instrument);
  } else if (provider === 'licensed') {
    quote = await licensedQuote(instrument);
  } else {
    quote = demoQuote(instrument);
  }
  quoteCache.set(cacheKey, { cachedAt: Date.now(), quote });
  return quote;
}

async function getQuotes(ids) {
  return Promise.all(ids.map((id) => getQuote(id)));
}

function cardStatsFor(instrument, quote, date = new Date()) {
  const seed = hashNumber(`${instrument.id}:${tradingDay(date)}:card`);
  const volatilityBase = ['Commodity Future', 'US Stock'].includes(instrument.assetClass) ? 50 : 35;
  const momentum = clamp(Math.round(50 + quote.changePercent * 7 + ((seed % 21) - 10)), 1, 99);
  const volatility = clamp(Math.round(volatilityBase + ((seed >> 4) % 45)), 1, 99);
  const volumeSurge = clamp(Math.round(30 + ((seed >> 8) % 70)), 1, 99);
  const newsHeat = clamp(Math.round(20 + ((seed >> 12) % 80)), 1, 99);
  const quality = clamp(Math.round(25 + ((seed >> 16) % 75)), 1, 99);
  const marketMuscle = clamp(Math.round(30 + Math.log10(basePriceFor(instrument) + 10) * 18 + ((seed >> 20) % 25)), 1, 99);
  const risk = clamp(Math.round((volatility + Math.abs(quote.changePercent) * 6 + ((seed >> 24) % 20)) / 1.4), 1, 99);
  return { momentum, volatility, volumeSurge, newsHeat, quality, marketMuscle, risk };
}

async function generateTrumpCards(limit = 20) {
  const selected = INSTRUMENTS.slice(0, limit);
  const cards = [];
  for (const instrument of selected) {
    const quote = await getQuote(instrument.id);
    cards.push({
      id: `card_${instrument.id}`,
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
      market: instrument.market,
      price: quote.price,
      changePercent: quote.changePercent,
      stats: cardStatsFor(instrument, quote)
    });
  }
  return cards;
}

module.exports = {
  INSTRUMENTS,
  getInstrument,
  getQuote,
  getQuotes,
  generateTrumpCards,
  cardStatsFor
};
