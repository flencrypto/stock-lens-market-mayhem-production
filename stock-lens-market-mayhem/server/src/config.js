'use strict';

const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  rootDir,
  publicDir: path.join(rootDir, 'public'),
  dataFile: path.join(rootDir, 'data', 'stocklens-data.json'),
  port: numberFromEnv('PORT', 8787),
  env: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Mr.FLEN Stock-LENS',
  startingBalance: numberFromEnv('STARTING_BALANCE', 1000),
  dailyTradeLimit: numberFromEnv('DAILY_TRADE_LIMIT', 1),
  quoteCacheSeconds: numberFromEnv('QUOTE_CACHE_SECONDS', 60),
  marketProvider: process.env.MARKET_PROVIDER || 'demo',
  marketDataBaseUrl: process.env.MARKET_DATA_BASE_URL || '',
  marketDataApiKey: process.env.MARKET_DATA_API_KEY || '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8787',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookGroupUrl: process.env.FACEBOOK_GROUP_URL || 'https://www.facebook.com/groups/',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'stocklens_session',
  corsAllowOrigin: process.env.CORS_ALLOW_ORIGIN || '*'
};

module.exports = config;
