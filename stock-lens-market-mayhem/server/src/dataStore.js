'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { nowIso, uid } = require('./utils');

const DEFAULT_LEAGUE_ID = 'stocklens-global-league';

function emptyData() {
  return {
    meta: {
      schemaVersion: 1,
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    users: [],
    leagues: [
      {
        id: DEFAULT_LEAGUE_ID,
        name: 'Mr.FLEN Stock-LENS Global League',
        startingBalance: config.startingBalance,
        dailyTradeLimit: config.dailyTradeLimit,
        createdAt: nowIso()
      }
    ],
    memberships: [],
    portfolios: [],
    positions: [],
    trades: [],
    priceSnapshots: [],
    dailyPortfolioSnapshots: [],
    challenges: [],
    challengeRounds: [],
    notificationSubscriptions: [],
    auditLogs: []
  };
}

function ensureDataFile() {
  const dir = path.dirname(config.dataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(config.dataFile)) {
    fs.writeFileSync(config.dataFile, JSON.stringify(emptyData(), null, 2));
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(config.dataFile, 'utf8');
  const data = JSON.parse(raw);
  // Defensive migrations for earlier dev builds.
  const fresh = emptyData();
  for (const key of Object.keys(fresh)) {
    if (data[key] === undefined) data[key] = fresh[key];
  }
  if (!data.leagues.find((league) => league.id === DEFAULT_LEAGUE_ID)) {
    data.leagues.push(fresh.leagues[0]);
  }
  return data;
}

function writeData(data) {
  data.meta = data.meta || {};
  data.meta.updatedAt = nowIso();
  const tmp = `${config.dataFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, config.dataFile);
}

function withData(mutator) {
  const data = readData();
  const result = mutator(data);
  writeData(data);
  return result;
}

function addAudit(data, action, actorId, payload = {}) {
  data.auditLogs.push({
    id: uid('audit'),
    action,
    actorId: actorId || 'system',
    payload,
    createdAt: nowIso()
  });
}

function findOrCreateUser(data, identity) {
  const provider = identity.provider || 'local';
  const providerUserId = String(identity.providerUserId || identity.playerId || 'anonymous').slice(0, 160);
  let user = data.users.find((candidate) => candidate.provider === provider && candidate.providerUserId === providerUserId);
  if (!user) {
    const displayName = identity.displayName || `Trader ${data.users.length + 1}`;
    user = {
      id: uid('user'),
      provider,
      providerUserId,
      displayName,
      avatarUrl: identity.avatarUrl || '',
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      flags: []
    };
    data.users.push(user);
    data.memberships.push({
      id: uid('member'),
      userId: user.id,
      leagueId: DEFAULT_LEAGUE_ID,
      joinedAt: nowIso(),
      role: 'player'
    });
    data.portfolios.push({
      id: uid('portfolio'),
      userId: user.id,
      leagueId: DEFAULT_LEAGUE_ID,
      cash: config.startingBalance,
      startingBalance: config.startingBalance,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    addAudit(data, 'USER_CREATED', user.id, { provider, providerUserId, displayName });
  } else {
    user.lastSeenAt = nowIso();
    if (identity.displayName && user.displayName !== identity.displayName) {
      user.displayName = String(identity.displayName).slice(0, 120);
    }
    if (identity.avatarUrl) user.avatarUrl = String(identity.avatarUrl).slice(0, 500);
  }
  return user;
}

function getPortfolio(data, userId, leagueId = DEFAULT_LEAGUE_ID) {
  return data.portfolios.find((portfolio) => portfolio.userId === userId && portfolio.leagueId === leagueId);
}

function getPositions(data, userId, leagueId = DEFAULT_LEAGUE_ID) {
  return data.positions.filter((position) => position.userId === userId && position.leagueId === leagueId && Math.abs(position.quantity) > 0.000001);
}

module.exports = {
  DEFAULT_LEAGUE_ID,
  emptyData,
  ensureDataFile,
  readData,
  writeData,
  withData,
  addAudit,
  findOrCreateUser,
  getPortfolio,
  getPositions
};
