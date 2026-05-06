'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./src/config');
const { readData, writeData, findOrCreateUser, DEFAULT_LEAGUE_ID, addAudit } = require('./src/dataStore');
const { INSTRUMENTS, getInstrument, getQuote, generateTrumpCards } = require('./src/marketData');
const { executeTrade, userMetrics, leaderboard, settleToday } = require('./src/portfolio');
const { createChallenge, playRound, listChallenges, challengeLeaderboard, STATS } = require('./src/stockTrumps');
const { safeJsonParse, normaliseText, uid, nowIso } = require('./src/utils');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, statusCode, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  res.end(payload);
}

function json(res, statusCode, body, headers = {}) {
  send(res, statusCode, body, { 'content-type': 'application/json; charset=utf-8', ...headers });
}

function corsHeaders(req) {
  const origin = req.headers.origin || '*';
  const allowOrigin = config.corsAllowOrigin === '*' ? origin : config.corsAllowOrigin;
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-headers': 'content-type, x-player-id, x-player-name, x-player-avatar, x-player-provider',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-credentials': 'true',
    'vary': 'Origin'
  };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 256) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw ? safeJsonParse(raw, {}) : {}));
    req.on('error', reject);
  });
}

function identityFromRequest(req, body = {}) {
  const headers = req.headers;
  const provider = normaliseText(headers['x-player-provider'] || body.provider, 'local');
  const providerUserId = normaliseText(headers['x-player-id'] || body.playerId || body.providerUserId, 'local_guest');
  const displayName = normaliseText(headers['x-player-name'] || body.displayName, provider === 'facebook-instant' ? 'Facebook Player' : 'Local Trader');
  const avatarUrl = normaliseText(headers['x-player-avatar'] || body.avatarUrl, '');
  return { provider, providerUserId, displayName, avatarUrl };
}

function getClientConfig() {
  return {
    appName: config.appName,
    startingBalance: config.startingBalance,
    dailyTradeLimit: config.dailyTradeLimit,
    marketProvider: config.marketProvider,
    quoteCacheSeconds: config.quoteCacheSeconds,
    facebookAppId: config.facebookAppId,
    facebookGroupUrl: config.facebookGroupUrl,
    publicBaseUrl: config.publicBaseUrl,
    disclaimer: 'Virtual trading game only. No real-money trading, brokerage service, investment advice, or financial return is provided.'
  };
}

async function bootstrap(req, body) {
  const data = readData();
  const user = findOrCreateUser(data, identityFromRequest(req, body));
  const metrics = await userMetrics(data, user.id, DEFAULT_LEAGUE_ID);
  const board = await leaderboard(data, DEFAULT_LEAGUE_ID);
  const trumpBoard = challengeLeaderboard(data);
  const cards = await generateTrumpCards(12);
  const challenges = listChallenges(data, user.id);
  writeData(data);
  return {
    config: getClientConfig(),
    user,
    instruments: INSTRUMENTS,
    portfolio: metrics,
    leaderboard: board,
    challengeLeaderboard: trumpBoard,
    trumpStats: STATS,
    trumpCards: cards,
    challenges
  };
}

function routeParam(pathname, pattern) {
  const names = [];
  const regexText = pattern.replace(/:[^/]+/g, (match) => {
    names.push(match.slice(1));
    return '([^/]+)';
  });
  const match = pathname.match(new RegExp(`^${regexText}$`));
  if (!match) return null;
  return names.reduce((acc, name, index) => {
    acc[name] = decodeURIComponent(match[index + 1]);
    return acc;
  }, {});
}

async function handleApi(req, res, parsed) {
  const pathname = parsed.pathname;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }
  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};

    if (req.method === 'GET' && pathname === '/api/health') {
      return json(res, 200, { ok: true, app: config.appName, env: config.env, provider: config.marketProvider, time: nowIso() }, corsHeaders(req));
    }

    if (req.method === 'GET' && pathname === '/api/instruments') {
      return json(res, 200, { instruments: INSTRUMENTS }, corsHeaders(req));
    }

    if (req.method === 'GET' && pathname === '/api/quotes') {
      const ids = String(parsed.query.ids || '').split(',').map((value) => value.trim()).filter(Boolean);
      if (ids.length > 64) {
        const error = new Error('Too many instruments requested. Maximum is 64.');
        error.statusCode = 400;
        throw error;
      }
      const unknown = ids.filter((id) => !getInstrument(id));
      if (unknown.length) {
        const error = new Error(`Unknown instrument(s): ${unknown.join(', ')}`);
        error.statusCode = 400;
        throw error;
      }
      const selected = ids.length ? ids : INSTRUMENTS.slice(0, 12).map((instrument) => instrument.id);
      const quotes = [];
      for (const id of selected) quotes.push(await getQuote(id));
      return json(res, 200, { quotes }, corsHeaders(req));
    }

    if (req.method === 'GET' && pathname === '/api/bootstrap') {
      return json(res, 200, await bootstrap(req, body), corsHeaders(req));
    }

    if (req.method === 'POST' && pathname === '/api/bootstrap') {
      return json(res, 200, await bootstrap(req, body), corsHeaders(req));
    }

    if (req.method === 'POST' && pathname === '/api/trade') {
      const data = readData();
      const user = findOrCreateUser(data, identityFromRequest(req, body));
      const result = await executeTrade(data, user, body);
      const board = await leaderboard(data, DEFAULT_LEAGUE_ID);
      writeData(data);
      return json(res, 200, { ok: true, ...result, leaderboard: board }, corsHeaders(req));
    }

    if (req.method === 'POST' && pathname === '/api/settle') {
      const data = readData();
      const snapshots = await settleToday(data, DEFAULT_LEAGUE_ID);
      const board = await leaderboard(data, DEFAULT_LEAGUE_ID);
      writeData(data);
      return json(res, 200, { ok: true, snapshots, leaderboard: board }, corsHeaders(req));
    }

    if (req.method === 'GET' && pathname === '/api/leaderboard') {
      const data = readData();
      return json(res, 200, { leaderboard: await leaderboard(data, DEFAULT_LEAGUE_ID), challengeLeaderboard: challengeLeaderboard(data) }, corsHeaders(req));
    }

    if (req.method === 'GET' && pathname === '/api/trump-cards') {
      return json(res, 200, { stats: STATS, cards: await generateTrumpCards(24) }, corsHeaders(req));
    }

    if (req.method === 'GET' && pathname === '/api/challenges') {
      const data = readData();
      const user = findOrCreateUser(data, identityFromRequest(req, body));
      writeData(data);
      return json(res, 200, { challenges: listChallenges(data, user.id), challengeLeaderboard: challengeLeaderboard(data) }, corsHeaders(req));
    }

    if (req.method === 'POST' && pathname === '/api/challenges') {
      const data = readData();
      const user = findOrCreateUser(data, identityFromRequest(req, body));
      const challenge = await createChallenge(data, user, body);
      writeData(data);
      return json(res, 200, { ok: true, challenge }, corsHeaders(req));
    }

    const playMatch = routeParam(pathname, '/api/challenges/:id/play');
    if (req.method === 'POST' && playMatch) {
      const data = readData();
      const user = findOrCreateUser(data, identityFromRequest(req, body));
      const result = await playRound(data, user, playMatch.id, body);
      writeData(data);
      return json(res, 200, { ok: true, ...result, challengeLeaderboard: challengeLeaderboard(data) }, corsHeaders(req));
    }

    if (req.method === 'POST' && pathname === '/api/notifications/subscribe') {
      const data = readData();
      const user = findOrCreateUser(data, identityFromRequest(req, body));
      const subscription = {
        id: uid('push'),
        userId: user.id,
        endpointHash: body.subscription && body.subscription.endpoint ? String(body.subscription.endpoint).slice(-24) : uid('endpoint'),
        subscription: body.subscription || {},
        createdAt: nowIso()
      };
      data.notificationSubscriptions = data.notificationSubscriptions.filter((item) => !(item.userId === user.id && item.endpointHash === subscription.endpointHash));
      data.notificationSubscriptions.push(subscription);
      addAudit(data, 'PUSH_SUBSCRIPTION_SAVED', user.id, { endpointHash: subscription.endpointHash });
      writeData(data);
      return json(res, 200, { ok: true, message: 'Push subscription saved. Connect a Web Push provider/VAPID sender in production to send scheduled alerts.' }, corsHeaders(req));
    }

    return json(res, 404, { error: 'API route not found' }, corsHeaders(req));
  } catch (error) {
    const status = error.statusCode || 500;
    return json(res, status, { error: error.message || 'Server error' }, corsHeaders(req));
  }
}

function safeStaticPath(pathname) {
  let requestPath;
  try {
    requestPath = decodeURIComponent(pathname);
  } catch (_error) {
    return null;
  }
  if (requestPath === '/') requestPath = '/index.html';
  const finalPath = path.normalize(path.join(config.publicDir, requestPath));
  if (!finalPath.startsWith(config.publicDir)) return null;
  return finalPath;
}

function handleStatic(_req, res, parsed) {
  const filePath = safeStaticPath(parsed.pathname);
  if (!filePath) return send(res, 403, 'Forbidden');
  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(config.publicDir, 'index.html'), (fallbackError, fallbackData) => {
        if (fallbackError) return send(res, 404, 'Not found');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
        res.end(fallbackData);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const immutable = /\.(?:png|jpg|jpeg|svg|ico)$/.test(ext);
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=86400' : 'no-cache'
    });
    res.end(data);
  });
}

function handleRequest(req, res) {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const parsed = {
    pathname: parsedUrl.pathname,
    query: Object.fromEntries(parsedUrl.searchParams.entries())
  };
  const pathname = parsed.pathname || '/';
  if (pathname.startsWith('/api/')) return handleApi(req, res, parsed);
  return handleStatic(req, res, parsed);
}

function createServer() {
  return http.createServer(handleRequest);
}

if (require.main === module) {
  const server = createServer();
  server.listen(config.port, () => {
    console.log(`${config.appName} running on http://localhost:${config.port}`);
    console.log(`Market provider: ${config.marketProvider}`);
  });
}

module.exports = {
  handleRequest,
  createServer
};
