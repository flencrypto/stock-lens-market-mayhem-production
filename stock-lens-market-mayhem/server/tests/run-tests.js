'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const { emptyData, findOrCreateUser } = require('../src/dataStore');
const { executeTrade, userMetrics, leaderboard } = require('../src/portfolio');
const { createChallenge, playRound } = require('../src/stockTrumps');
const { INSTRUMENTS, getQuote, generateTrumpCards } = require('../src/marketData');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServerForApiTests(port, extraEnv = {}) {
  const serverProcess = spawn(process.execPath, ['server/server.js'], {
    cwd: require('path').resolve(__dirname, '..', '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', MARKET_PROVIDER: 'demo', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let startupLogs = '';
  serverProcess.stdout.on('data', (chunk) => {
    startupLogs += String(chunk);
  });
  serverProcess.stderr.on('data', (chunk) => {
    startupLogs += String(chunk);
  });

  for (let attempt = 0; attempt < 30; attempt++) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`API test server exited early with code ${serverProcess.exitCode}. Logs:\n${startupLogs}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return serverProcess;
    } catch (_error) {
      // Continue retry loop until server is ready.
    }
    await sleep(100);
  }
  serverProcess.kill('SIGTERM');
  throw new Error(`API test server did not start on port ${port}. Logs:\n${startupLogs}`);
}

async function stopServerForApiTests(serverProcess) {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  serverProcess.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => serverProcess.once('exit', resolve)),
    sleep(1500)
  ]);
  if (serverProcess.exitCode === null) {
    serverProcess.kill('SIGKILL');
  }
}

async function testMarketData() {
  assert.ok(INSTRUMENTS.length >= 20, 'instrument universe should include broad coverage');
  const quote = await getQuote('AAPL', { provider: 'demo' });
  assert.equal(quote.instrumentId, 'AAPL');
  assert.ok(quote.price > 0, 'quote price should be positive');
  const cards = await generateTrumpCards(5);
  assert.equal(cards.length, 5);
  assert.ok(cards[0].stats.momentum >= 1, 'card stats should be generated');
}

async function testOneTradePerDay() {
  const data = emptyData();
  const user = findOrCreateUser(data, { provider: 'local', providerUserId: 'test-user', displayName: 'Test Trader' });
  const trade = await executeTrade(data, user, { instrumentId: 'AAPL', side: 'BUY', notional: 100 });
  assert.equal(trade.trade.side, 'BUY');
  assert.equal(data.trades.length, 1);
  await assert.rejects(() => executeTrade(data, user, { instrumentId: 'NVDA', side: 'BUY', notional: 100 }), /Daily trade already used/);
}

async function testPortfolioMetricsAndLeaderboard() {
  const data = emptyData();
  const localUser = findOrCreateUser(data, { provider: 'local', providerUserId: 'metric-user', displayName: 'Metric Trader' });
  const facebookUser = findOrCreateUser(data, { provider: 'facebook-web', providerUserId: 'fb-metric-user', displayName: 'Facebook Trader' });
  await executeTrade(data, localUser, { instrumentId: 'AAPL', side: 'BUY', notional: 250 });
  data.trades = [];
  await executeTrade(data, facebookUser, { instrumentId: 'AAPL', side: 'BUY', notional: 250 });
  const metrics = await userMetrics(data, facebookUser.id);
  assert.ok(metrics.portfolioValue > 0, 'portfolio value should calculate');
  assert.equal(metrics.stats.daysTraded, 1, 'days traded should update');
  const board = await leaderboard(data);
  assert.equal(board.every((row) => row.displayName !== 'Metric Trader'), true, 'local users should not appear on leaderboard');
  assert.equal(board.length, 1);
  assert.equal(board[0].displayName, 'Facebook Trader');
  assert.equal(board[0].rank, 1);
}

async function testStockTrumps() {
  const data = emptyData();
  const user = findOrCreateUser(data, { provider: 'local', providerUserId: 'trumps-user', displayName: 'Trumps Trader' });
  const challenge = await createChallenge(data, user, {});
  assert.equal(challenge.status, 'active');
  let last;
  for (let i = 0; i < 5; i++) {
    last = await playRound(data, user, challenge.id, { stat: 'momentum' });
  }
  assert.equal(last.challenge.status, 'complete');
  assert.ok(last.challenge.winnerId, 'winner should be set');
}

async function testQuotesApiValidation() {
  const port = 9800 + Math.floor(Math.random() * 800);
  const serverProcess = await startServerForApiTests(port);
  try {
    const unknownResponse = await fetch(`http://127.0.0.1:${port}/api/quotes?ids=AAPL,NOPE_123`);
    assert.equal(unknownResponse.status, 400, 'unknown symbols should return 400');
    const unknownBody = await unknownResponse.json();
    assert.match(unknownBody.error, /Unknown instrument\(s\): NOPE_123/, 'unknown symbol error should include symbol');

    const ids = Array.from({ length: 65 }, () => 'AAPL').join(',');
    const tooManyResponse = await fetch(`http://127.0.0.1:${port}/api/quotes?ids=${encodeURIComponent(ids)}`);
    assert.equal(tooManyResponse.status, 400, 'too many ids should return 400');
    const tooManyBody = await tooManyResponse.json();
    assert.match(tooManyBody.error, /Too many instruments requested/, 'too many ids should be rejected with clear error');
  } finally {
    await stopServerForApiTests(serverProcess);
  }
}

async function testApiHardening() {
  const port = 10650 + Math.floor(Math.random() * 800);
  const serverProcess = await startServerForApiTests(port, { CORS_ALLOW_ORIGIN: '*' });
  try {
    const corsResponse = await fetch(`http://127.0.0.1:${port}/api/bootstrap`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://attacker.example' }
    });
    assert.equal(corsResponse.status, 204, 'CORS preflight should succeed');
    assert.equal(corsResponse.headers.get('access-control-allow-origin'), '*', 'wildcard CORS should remain wildcard');
    assert.equal(corsResponse.headers.has('access-control-allow-credentials'), false, 'wildcard CORS must not allow credentials');

    const badJsonResponse = await fetch(`http://127.0.0.1:${port}/api/trade`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad json'
    });
    assert.equal(badJsonResponse.status, 400, 'invalid JSON should return 400');
    const badJsonBody = await badJsonResponse.json();
    assert.match(badJsonBody.error, /valid JSON object/, 'invalid JSON response should explain the problem');

    const traversalResponse = await fetch(`http://127.0.0.1:${port}/..%2Fpackage.json`);
    assert.equal(traversalResponse.status, 403, 'static traversal attempts should be rejected');
  } finally {
    await stopServerForApiTests(serverProcess);
  }
}

async function run() {
  await testMarketData();
  await testOneTradePerDay();
  await testPortfolioMetricsAndLeaderboard();
  await testStockTrumps();
  await testQuotesApiValidation();
  await testApiHardening();
  console.log('All Stock-LENS tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
