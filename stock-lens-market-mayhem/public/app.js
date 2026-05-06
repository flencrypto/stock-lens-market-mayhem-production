const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const STORAGE_KEYS = {
  player: 'stocklens_player_v1',
  offline: 'stocklens_offline_state_v1',
  leaderboardCache: 'stocklens_leaderboard_cache_v1'
};

const LOCAL_INSTRUMENTS = [
  { id: 'AAPL', symbol: 'AAPL', name: 'Apple', assetClass: 'US Stock', market: 'US', currency: 'USD' },
  { id: 'NVDA', symbol: 'NVDA', name: 'NVIDIA', assetClass: 'US Stock', market: 'US', currency: 'USD' },
  { id: 'TSLA', symbol: 'TSLA', name: 'Tesla', assetClass: 'US Stock', market: 'US', currency: 'USD' },
  { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft', assetClass: 'US Stock', market: 'US', currency: 'USD' },
  { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet', assetClass: 'US Stock', market: 'US', currency: 'USD' },
  { id: 'AMD', symbol: 'AMD', name: 'AMD', assetClass: 'US Stock', market: 'US', currency: 'USD' },
  { id: 'PLTR', symbol: 'PLTR', name: 'Palantir', assetClass: 'US Stock', market: 'US', currency: 'USD' },
  { id: 'RR.L', symbol: 'RR.L', name: 'Rolls-Royce Holdings', assetClass: 'UK Stock', market: 'FTSE', currency: 'GBP' },
  { id: 'AZN.L', symbol: 'AZN.L', name: 'AstraZeneca', assetClass: 'UK Stock', market: 'FTSE', currency: 'GBP' },
  { id: 'SHEL.L', symbol: 'SHEL.L', name: 'Shell', assetClass: 'UK Stock', market: 'FTSE', currency: 'GBP' },
  { id: 'BP.L', symbol: 'BP.L', name: 'BP', assetClass: 'UK Stock', market: 'FTSE', currency: 'GBP' },
  { id: 'BARC.L', symbol: 'BARC.L', name: 'Barclays', assetClass: 'UK Stock', market: 'FTSE', currency: 'GBP' },
  { id: 'FTSE100', symbol: '^FTSE', name: 'FTSE 100 Index', assetClass: 'Index', market: 'UK', currency: 'GBP' },
  { id: 'SP500', symbol: '^GSPC', name: 'S&P 500 Index', assetClass: 'Index', market: 'US', currency: 'USD' },
  { id: 'NASDAQ100', symbol: '^NDX', name: 'Nasdaq 100 Index', assetClass: 'Index', market: 'US', currency: 'USD' },
  { id: 'GOLD', symbol: 'GC=F', name: 'Gold Futures', assetClass: 'Commodity Future', market: 'COMEX', currency: 'USD' },
  { id: 'OIL', symbol: 'CL=F', name: 'WTI Crude Oil Futures', assetClass: 'Commodity Future', market: 'NYMEX', currency: 'USD' },
  { id: 'SILVER', symbol: 'SI=F', name: 'Silver Futures', assetClass: 'Commodity Future', market: 'COMEX', currency: 'USD' },
  { id: 'NATGAS', symbol: 'NG=F', name: 'Natural Gas Futures', assetClass: 'Commodity Future', market: 'NYMEX', currency: 'USD' },
  { id: 'WHEAT', symbol: 'ZW=F', name: 'Wheat Futures', assetClass: 'Commodity Future', market: 'CBOT', currency: 'USD' }
];

const TRUMP_STATS = [
  { key: 'momentum', label: 'Momentum' },
  { key: 'volatility', label: 'Volatility' },
  { key: 'volumeSurge', label: 'Volume Surge' },
  { key: 'newsHeat', label: 'News Heat' },
  { key: 'quality', label: 'Quality' },
  { key: 'marketMuscle', label: 'Market Muscle' },
  { key: 'risk', label: 'Risk Rating' }
];

const ROUTE_PATHS = {
  dashboard: '/',
  trade: '/trade',
  leaderboard: '/leaderboard',
  trumps: '/trumps',
  profile: '/profile'
};

const ROUTE_SEQUENCE = ['dashboard', 'trade', 'leaderboard', 'trumps', 'profile'];

const transitionState = {
  cleanupTimer: 0,
  renderToken: 0,
  renderedRoute: ''
};

function routeFromLocation(locationLike = window.location) {
  const pathname = (locationLike.pathname || '/').replace(/\/+$/, '') || '/';
  if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
  if (pathname === '/trade') return 'trade';
  if (pathname === '/leaderboard') return 'leaderboard';
  if (pathname === '/trumps') return 'trumps';
  if (pathname === '/profile') return 'profile';
  return 'dashboard';
}

function routeDirection(fromRoute, toRoute) {
  const fromIndex = ROUTE_SEQUENCE.indexOf(fromRoute);
  const toIndex = ROUTE_SEQUENCE.indexOf(toRoute);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return 'forward';
  return toIndex > fromIndex ? 'forward' : 'backward';
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function wrapViewMarkup(route, markup, extraClass = '', extraAttributes = '') {
  const classes = ['view-screen', 'is-active', extraClass].filter(Boolean).join(' ');
  return `<div class="${classes}" data-route="${route}" ${extraAttributes}>${markup}</div>`;
}

function syncRouteToLocation(replace = false) {
  const targetPath = ROUTE_PATHS[state.route] || ROUTE_PATHS.dashboard;
  const currentPath = window.location.pathname || '/';
  if (currentPath === targetPath) return;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ route: state.route }, '', targetPath);
}

function handleLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const launchInstrument = params.get('instrument');
  const sharedText = params.get('share-text');
  const sharedTitle = params.get('share-title');
  const sharedUrl = params.get('share-url');

  state.route = routeFromLocation();

  if (launchInstrument && state.instruments.some((instrument) => instrument.id === launchInstrument)) {
    state.selectedInstrumentId = launchInstrument;
  }

  if (sharedText || sharedTitle || sharedUrl) {
    state.route = 'profile';
    window.setTimeout(() => {
      toast('Shared content received in the app.');
    }, 400);
  }
}

const state = {
  route: routeFromLocation(),
  ready: false,
  fb: { available: false, playerId: '', playerName: '', avatarUrl: '', sdkReady: false, mode: 'pwa' },
  offlineMode: false,
  config: {
    appName: 'Mr.FLEN Stock-LENS',
    startingBalance: 1000,
    dailyTradeLimit: 1,
    facebookAppId: '',
    facebookGroupUrl: 'https://www.facebook.com/groups/',
    disclaimer: 'Virtual trading game only. No real-money trading, brokerage service, investment advice, or financial return is provided.'
  },
  user: null,
  instruments: LOCAL_INSTRUMENTS,
  portfolio: null,
  leaderboard: [],
  challengeLeaderboard: [],
  trumpCards: [],
  challenges: [],
  selectedInstrumentId: 'AAPL',
  selectedSide: 'BUY',
  selectedAmount: 250,
  lastRound: null,
  deferredInstallPrompt: null
};

function setProgress(value, message) {
  const bar = $('#boot-progress');
  const status = $('#boot-status');
  if (bar) bar.style.width = `${Math.max(8, Math.min(100, value))}%`;
  if (status && message) status.textContent = message;
  try {
    if (window.FBInstant && typeof window.FBInstant.setLoadingProgress === 'function') {
      window.FBInstant.setLoadingProgress(Math.round(value));
    }
  } catch (_) {}
}

function currency(value, sign = true) {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const number = Number(value || 0);
  if (!sign) return formatter.format(Math.abs(number));
  return formatter.format(number);
}

function percent(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function clsFor(value) {
  const number = Number(value || 0);
  return number > 0 ? 'positive' : number < 0 ? 'negative' : 'muted';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function hashNumber(input) {
  let h = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getPlayer() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.player) || 'null');
  if (saved && saved.providerUserId) return saved;
  const fresh = {
    provider: 'local',
    providerUserId: `local_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`,
    displayName: `Trader ${Math.floor(Math.random() * 9000) + 1000}`,
    avatarUrl: ''
  };
  localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(fresh));
  return fresh;
}

function savePlayer(player) {
  localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(player));
}

function isAuthenticatedFacebookPlayer(player = getPlayer()) {
  return String(player?.provider || '').startsWith('facebook') && Boolean(player?.providerUserId);
}

function readLeaderboardCache() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.leaderboardCache) || 'null');
}

function writeLeaderboardCache(player, leaderboard, challengeLeaderboard) {
  if (!isAuthenticatedFacebookPlayer(player)) return;
  localStorage.setItem(STORAGE_KEYS.leaderboardCache, JSON.stringify({
    playerId: player.providerUserId,
    leaderboard: leaderboard || [],
    challengeLeaderboard: challengeLeaderboard || [],
    cachedAt: new Date().toISOString()
  }));
}

function applyCachedLeaderboard(player = getPlayer()) {
  const cache = readLeaderboardCache();
  if (!cache || cache.playerId !== player.providerUserId) return false;
  state.leaderboard = cache.leaderboard || [];
  state.challengeLeaderboard = cache.challengeLeaderboard || [];
  return true;
}

function clearLeaderboardCache(playerId) {
  const cache = readLeaderboardCache();
  if (!cache) return;
  if (!playerId || cache.playerId === playerId) {
    localStorage.removeItem(STORAGE_KEYS.leaderboardCache);
  }
}

async function initFacebookInstant() {
  setProgress(18, 'Checking Facebook Instant Games shell...');
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (!window.FBInstant) return false;
  try {
    await window.FBInstant.initializeAsync();
    setProgress(46, 'Facebook shell ready...');
    const player = window.FBInstant.player;
    state.fb.available = true;
    state.fb.playerId = player.getID ? player.getID() : '';
    state.fb.playerName = player.getName ? player.getName() : '';
    state.fb.avatarUrl = player.getPhoto ? player.getPhoto() : '';
    state.fb.mode = 'facebook-instant';
    const local = getPlayer();
    const merged = {
      ...local,
      provider: 'facebook-instant',
      providerUserId: state.fb.playerId || local.providerUserId,
      displayName: state.fb.playerName || local.displayName,
      avatarUrl: state.fb.avatarUrl || local.avatarUrl
    };
    savePlayer(merged);
    clearLeaderboardCache(merged.providerUserId);
    await window.FBInstant.startGameAsync();
    return true;
  } catch (error) {
    console.warn('FBInstant init failed, falling back to PWA/local mode', error);
    return false;
  }
}

function loadFacebookSdk(appId) {
  if (!appId) return Promise.resolve(false);
  if (window.FB && state.fb.sdkReady) return Promise.resolve(true);

  return new Promise((resolve, reject) => {
    const finishInit = () => {
      try {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: 'v22.0'
        });
        state.fb.sdkReady = true;
        resolve(true);
      } catch (error) {
        reject(error);
      }
    };

    if (window.FB) {
      finishInit();
      return;
    }

    window.fbAsyncInit = finishInit;

    if (document.getElementById('facebook-jssdk')) return;

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onerror = () => reject(new Error('Facebook SDK failed to load'));
    document.head.appendChild(script);
  });
}

function getFacebookLoginStatus() {
  return new Promise((resolve) => {
    window.FB.getLoginStatus((response) => resolve(response));
  });
}

function getFacebookProfile() {
  return new Promise((resolve, reject) => {
    window.FB.api('/me', { fields: 'id,name,picture.width(128).height(128)' }, (response) => {
      if (!response || response.error) {
        reject(new Error(response?.error?.message || 'Facebook profile request failed'));
        return;
      }
      resolve(response);
    });
  });
}

async function syncFacebookWebPlayer() {
  const profile = await getFacebookProfile();
  const local = getPlayer();
  state.fb.available = true;
  state.fb.playerId = profile.id || local.providerUserId;
  state.fb.playerName = profile.name || local.displayName;
  state.fb.avatarUrl = profile.picture?.data?.url || local.avatarUrl || '';
  state.fb.mode = 'facebook-web';

  savePlayer({
    ...local,
    provider: 'facebook-web',
    providerUserId: state.fb.playerId,
    displayName: state.fb.playerName,
    avatarUrl: state.fb.avatarUrl
  });
  clearLeaderboardCache(state.fb.playerId);
}

async function initFacebookWebLogin() {
  if (state.fb.available || !state.config.facebookAppId) return false;
  try {
    await loadFacebookSdk(state.config.facebookAppId);
    const status = await getFacebookLoginStatus();
    if (status.status !== 'connected') return false;
    await syncFacebookWebPlayer();
    return true;
  } catch (error) {
    console.warn('Facebook web login init failed', error);
    return false;
  }
}

async function signInWithFacebook() {
  if (!state.config.facebookAppId) {
    toast('Set FACEBOOK_APP_ID to enable Facebook sign-in.');
    return;
  }

  try {
    await loadFacebookSdk(state.config.facebookAppId);
    const response = await new Promise((resolve) => {
      window.FB.login((loginResponse) => resolve(loginResponse), { scope: 'public_profile' });
    });

    if (!response || !response.authResponse) {
      throw new Error('Facebook sign-in was cancelled.');
    }

    await syncFacebookWebPlayer();
    await loadAppData();
    render();
    toast('Signed in with Facebook.');
  } catch (error) {
    toast(error.message || 'Facebook sign-in failed.');
  }
}

function apiHeaders() {
  const player = getPlayer();
  return {
    'content-type': 'application/json',
    'x-player-provider': player.provider,
    'x-player-id': player.providerUserId,
    'x-player-name': player.displayName,
    'x-player-avatar': player.avatarUrl || ''
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: apiHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function demoQuote(instrument) {
  const bases = {
    AAPL: 200, NVDA: 900, TSLA: 220, MSFT: 430, GOOGL: 170, AMD: 160, PLTR: 35,
    'RR.L': 420, 'AZN.L': 11800, 'SHEL.L': 2850, 'BP.L': 480, 'BARC.L': 210,
    FTSE100: 8200, SP500: 5200, NASDAQ100: 18500, GOLD: 2350, OIL: 82, SILVER: 29, NATGAS: 2.7, WHEAT: 610
  };
  const base = bases[instrument.id] || 100;
  const daySeed = hashNumber(`${instrument.id}:${today()}`);
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  const noiseSeed = hashNumber(`${instrument.id}:${bucket}`);
  const drift = ((daySeed % 1401) - 700) / 10000;
  const noise = ((noiseSeed % 241) - 120) / 10000;
  const price = roundMoney(base * (1 + drift + noise));
  const previousClose = roundMoney(base * (1 + (((hashNumber(`${instrument.id}:prev:${today()}`) % 801) - 400) / 10000)));
  const change = roundMoney(price - previousClose);
  const changePercent = previousClose ? ((change / previousClose) * 100) : 0;
  return { instrumentId: instrument.id, symbol: instrument.symbol, price, previousClose, change, changePercent, source: 'local-demo' };
}

function initialOfflineState() {
  const player = getPlayer();
  return {
    user: {
      id: player.providerUserId,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      provider: player.provider,
      providerUserId: player.providerUserId
    },
    cash: 1000,
    positions: [],
    trades: [],
    snapshots: [],
    challenges: [],
    createdAt: new Date().toISOString()
  };
}

function loadOffline() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.offline) || 'null');
  return saved || initialOfflineState();
}

function saveOffline(data) {
  localStorage.setItem(STORAGE_KEYS.offline, JSON.stringify(data));
}

function offlinePortfolio(data = loadOffline()) {
  const positions = data.positions.map((pos) => {
    const instrument = LOCAL_INSTRUMENTS.find((item) => item.id === pos.instrumentId);
    const quote = demoQuote(instrument);
    return { ...pos, quote, marketValue: roundMoney(pos.quantity * quote.price), unrealisedPnl: roundMoney((quote.price - pos.avgPrice) * pos.quantity) };
  });
  const positionsValue = roundMoney(positions.reduce((sum, pos) => sum + pos.marketValue, 0));
  const portfolioValue = roundMoney(data.cash + positionsValue);
  const uniqueTradeDays = new Set(data.trades.map((trade) => trade.tradeDay));
  const todayTrades = data.trades.filter((trade) => trade.tradeDay === today()).length;
  const gains = data.snapshots.filter((snap) => snap.dailyPnl > 0);
  const losses = data.snapshots.filter((snap) => snap.dailyPnl < 0);
  return {
    cash: roundMoney(data.cash),
    positions,
    positionsValue,
    portfolioValue,
    pnl: roundMoney(portfolioValue - 1000),
    pnlPercent: ((portfolioValue - 1000) / 1000) * 100,
    stats: {
      daysTraded: uniqueTradeDays.size,
      daysGained: gains.length,
      daysLost: losses.length,
      winRate: data.snapshots.length ? (gains.length / data.snapshots.length) * 100 : 0,
      biggestGain: data.snapshots.length ? Math.max(...data.snapshots.map((s) => s.dailyPnl)) : 0,
      biggestLoss: data.snapshots.length ? Math.min(...data.snapshots.map((s) => s.dailyPnl)) : 0,
      tradesUsedToday: todayTrades,
      dailyTradesRemaining: Math.max(0, 1 - todayTrades),
      challengeWins: data.challenges.filter((c) => c.status === 'complete' && c.winner === 'player').length,
      challengeLosses: data.challenges.filter((c) => c.status === 'complete' && c.winner === 'bot').length
    }
  };
}

function createOfflineLeaderboard(portfolio) {
  const rivals = ['Bullish Barry', 'FTSE Fiona', 'NASDAQ Nige', 'Candlestick Cara', 'Dividend Dave', 'Bear Trap Bev'];
  const rows = rivals.map((name, index) => {
    const seed = hashNumber(`${name}:${today()}`);
    const value = roundMoney(890 + (seed % 390));
    return {
      rank: index + 1,
      userId: `bot_${index}`,
      displayName: name,
      portfolioValue: value,
      pnl: roundMoney(value - 1000),
      pnlPercent: ((value - 1000) / 1000) * 100,
      daysTraded: 3 + (seed % 15),
      daysGained: seed % 9,
      daysLost: seed % 5,
      biggestGain: 10 + (seed % 160),
      biggestLoss: -(10 + (seed % 130)),
      challengeWins: seed % 12,
      challengeLosses: seed % 8
    };
  });
  rows.push({
    rank: 0,
    userId: state.user?.id || 'me',
    displayName: state.user?.displayName || getPlayer().displayName,
    portfolioValue: portfolio.portfolioValue,
    pnl: portfolio.pnl,
    pnlPercent: portfolio.pnlPercent,
    daysTraded: portfolio.stats.daysTraded,
    daysGained: portfolio.stats.daysGained,
    daysLost: portfolio.stats.daysLost,
    biggestGain: portfolio.stats.biggestGain,
    biggestLoss: portfolio.stats.biggestLoss,
    challengeWins: portfolio.stats.challengeWins,
    challengeLosses: portfolio.stats.challengeLosses
  });
  return rows.sort((a, b) => b.portfolioValue - a.portfolioValue).map((row, index) => ({ ...row, rank: index + 1 }));
}

function cardStatsFor(instrument, quote) {
  const seed = hashNumber(`${instrument.id}:${today()}:card`);
  return {
    momentum: Math.max(1, Math.min(99, Math.round(50 + quote.changePercent * 7 + ((seed % 21) - 10)))),
    volatility: Math.max(1, Math.min(99, Math.round(35 + ((seed >> 4) % 55)))),
    volumeSurge: Math.max(1, Math.min(99, Math.round(30 + ((seed >> 8) % 70)))),
    newsHeat: Math.max(1, Math.min(99, Math.round(20 + ((seed >> 12) % 80)))),
    quality: Math.max(1, Math.min(99, Math.round(25 + ((seed >> 16) % 75)))),
    marketMuscle: Math.max(1, Math.min(99, Math.round(30 + ((seed >> 20) % 69)))),
    risk: Math.max(1, Math.min(99, Math.round(20 + ((seed >> 24) % 79))))
  };
}

function offlineCards() {
  return LOCAL_INSTRUMENTS.slice(0, 18).map((instrument) => {
    const quote = demoQuote(instrument);
    return { id: `card_${instrument.id}`, ...instrument, price: quote.price, changePercent: quote.changePercent, stats: cardStatsFor(instrument, quote) };
  });
}

function refreshOfflineState() {
  const data = loadOffline();
  const player = getPlayer();
  data.user.displayName = player.displayName;
  saveOffline(data);
  const portfolio = offlinePortfolio(data);
  state.offlineMode = true;
  state.user = data.user;
  state.instruments = LOCAL_INSTRUMENTS;
  state.portfolio = portfolio;
  state.leaderboard = createOfflineLeaderboard(portfolio);
  state.trumpStats = TRUMP_STATS;
  state.trumpCards = offlineCards();
  state.challenges = data.challenges || [];
  state.challengeLeaderboard = [
    { rank: 1, userId: state.user.id, wins: portfolio.stats.challengeWins, losses: portfolio.stats.challengeLosses, played: portfolio.stats.challengeWins + portfolio.stats.challengeLosses, points: portfolio.stats.challengeWins * 3 }
  ];
}

async function loadAppData() {
  setProgress(62, 'Loading league data...');
  try {
    const payload = await api('/api/bootstrap');
    state.offlineMode = false;
    state.config = payload.config || state.config;
    state.user = payload.user;
    state.instruments = payload.instruments || LOCAL_INSTRUMENTS;
    state.portfolio = payload.portfolio;
    const player = getPlayer();
    const usedCache = applyCachedLeaderboard(player);
    if (!usedCache) {
      state.leaderboard = payload.leaderboard || [];
      state.challengeLeaderboard = payload.challengeLeaderboard || [];
      writeLeaderboardCache(player, state.leaderboard, state.challengeLeaderboard);
    }
    state.trumpStats = payload.trumpStats || TRUMP_STATS;
    state.trumpCards = payload.trumpCards || [];
    state.challenges = payload.challenges || [];
  } catch (error) {
    console.warn('API unavailable, using offline/PWA demo mode:', error);
    refreshOfflineState();
  }
}

function toast(message, timeout = 3600) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, timeout);
}

function mountApp() {
  const template = $('#app-template');
  $('#app').innerHTML = template.innerHTML;
  bindGlobalEvents();
  render();
}

function bindGlobalEvents() {
  document.addEventListener('click', async (event) => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      state.route = routeButton.dataset.route;
      syncRouteToLocation();
      render();
    }
  });
  window.addEventListener('popstate', () => {
    state.route = routeFromLocation();
    render();
  });
  $('#share-button')?.addEventListener('click', shareLeagueCard);
  $('#install-button')?.addEventListener('click', async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    $('#install-button').hidden = true;
  });
}

function updateTabs() {
  $$('.tabbar button').forEach((button) => button.classList.toggle('active', button.dataset.route === state.route));
}

function metricCard(label, value, note = '', className = '') {
  return `<article class="metric-card"><p class="metric-label">${label}</p><p class="metric-value ${className}">${value}</p>${note ? `<p class="metric-note">${note}</p>` : ''}</article>`;
}

function render() {
  updateTabs();
  const view = $('#view');
  if (!view) return;
  const routes = {
    dashboard: renderDashboard,
    trade: renderTrade,
    leaderboard: renderLeaderboard,
    trumps: renderTrumps,
    profile: renderProfile
  };
  const nextMarkup = (routes[state.route] || renderDashboard)();
  const displayedRoute = view.querySelector('.view-screen.is-active')?.dataset.route || transitionState.renderedRoute;
  const routeChanged = Boolean(displayedRoute && displayedRoute !== state.route);
  const previousMarkup = view.querySelector('.view-screen.is-active')?.innerHTML || '';
  const renderToken = ++transitionState.renderToken;

  clearTimeout(transitionState.cleanupTimer);

  if (!routeChanged || !previousMarkup || prefersReducedMotion()) {
    view.classList.remove('is-transitioning', 'is-transition-running');
    delete view.dataset.transitionDirection;
    view.innerHTML = wrapViewMarkup(state.route, nextMarkup);
    transitionState.renderedRoute = state.route;
    bindViewEvents();
    return;
  }

  view.dataset.transitionDirection = routeDirection(displayedRoute, state.route);
  view.classList.add('is-transitioning');
  view.classList.remove('is-transition-running');
  view.innerHTML = [
    wrapViewMarkup(state.route, nextMarkup, 'is-enter'),
    `<div class="view-screen is-exit" data-route="${displayedRoute}" aria-hidden="true">${previousMarkup}</div>`
  ].join('');
  transitionState.renderedRoute = state.route;
  bindViewEvents();

  requestAnimationFrame(() => {
    if (renderToken !== transitionState.renderToken) return;
    view.classList.add('is-transition-running');
  });

  transitionState.cleanupTimer = window.setTimeout(() => {
    if (renderToken !== transitionState.renderToken) return;
    view.classList.remove('is-transitioning', 'is-transition-running');
    delete view.dataset.transitionDirection;
    view.innerHTML = wrapViewMarkup(state.route, nextMarkup);
  }, 520);
}

function renderDashboard() {
  const p = state.portfolio;
  const userRank = state.leaderboard.find((row) => row.userId === state.user?.id) || state.leaderboard[0];
  const movers = state.instruments.slice(0, 8).map((instrument) => ({ instrument, quote: demoQuote(instrument) })).sort((a, b) => Math.abs(b.quote.changePercent) - Math.abs(a.quote.changePercent));
  return `
    <section class="grid cols-4">
      ${metricCard('Portfolio Value', currency(p.portfolioValue), `${currency(p.pnl)} · ${percent(p.pnlPercent)}`, clsFor(p.pnl))}
      ${metricCard('League Rank', `#${userRank?.rank || '-'}`, `${state.leaderboard.length} active players`, '')}
      ${metricCard('Trades Today', `${p.stats.tradesUsedToday}/${state.config.dailyTradeLimit || 1}`, p.stats.dailyTradesRemaining ? 'Trade still available' : 'Daily trade used', p.stats.dailyTradesRemaining ? 'yellow' : 'muted')}
      ${metricCard('Stock-TRUMPS', `${p.stats.challengeWins}W/${p.stats.challengeLosses}L`, 'Side-game record', 'positive')}
    </section>

    <section class="grid cols-2" style="margin-top:14px;">
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2>Daily Market Briefing</h2>
            <p>${state.offlineMode ? 'Offline/PWA demo mode is active. Connect the server and licensed data provider for live production prices.' : 'Server league mode active.'}</p>
          </div>
          <span class="status-pill ${state.offlineMode ? 'yellow' : 'green'}">${state.offlineMode ? 'Demo' : 'Live API'}</span>
        </div>
        <div class="instrument-grid">
          ${movers.slice(0, 4).map(({ instrument, quote }) => `
            <button class="instrument-button" data-select-instrument="${instrument.id}" data-route="trade">
              <strong>${instrument.symbol}</strong>
              <span>${instrument.name} · ${instrument.assetClass}</span>
              <em class="${clsFor(quote.changePercent)}">${percent(quote.changePercent)}</em>
            </button>
          `).join('')}
        </div>
        <p class="disclaimer">${state.config.disclaimer}</p>
      </article>

      <article class="table-card">
        <div class="panel-header">
          <div>
            <h2>Top of the Board</h2>
            <p>Friday leaderboard drop material, ready for the Facebook Group.</p>
          </div>
          <button class="ghost-button compact" id="download-card">Download card</button>
        </div>
        ${leaderboardTable(state.leaderboard.slice(0, 5), true)}
      </article>
    </section>

    <section class="panel" style="margin-top:14px;">
      <div class="panel-header">
        <div>
          <h2>Your Open Positions</h2>
          <p>Cash: ${currency(p.cash)} · Positions: ${currency(p.positionsValue)}</p>
        </div>
        <button class="primary-button compact" data-route="trade">Use today’s trade</button>
      </div>
      ${positionsTable(p.positions)}
    </section>
  `;
}

function positionsTable(positions) {
  if (!positions || !positions.length) {
    return `<p class="muted">No open positions yet. Go cause some market-based nonsense.</p>`;
  }
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Asset</th><th>Qty</th><th>Avg</th><th>Now</th><th>Value</th><th>P/L</th></tr></thead><tbody>
    ${positions.map((pos) => `<tr>
      <td><span class="asset-pill">${pos.quote?.symbol || pos.instrumentId}</span></td>
      <td>${Number(pos.quantity).toFixed(4)}</td>
      <td>${currency(pos.avgPrice)}</td>
      <td>${currency(pos.quote?.price || 0)}</td>
      <td>${currency(pos.marketValue)}</td>
      <td class="${clsFor(pos.unrealisedPnl)}">${currency(pos.unrealisedPnl)}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function renderTrade() {
  const instrument = state.instruments.find((item) => item.id === state.selectedInstrumentId) || state.instruments[0];
  const quote = demoQuote(instrument);
  const p = state.portfolio;
  const disabled = p.stats.dailyTradesRemaining <= 0;
  return `
    <section class="grid cols-2">
      <article class="trade-ticket">
        <div class="panel-header">
          <div>
            <h2>Daily Trade Ticket</h2>
            <p>One trade per day. Once confirmed, it locks into the ledger.</p>
          </div>
          <span class="status-pill ${disabled ? 'red' : 'green'}">${disabled ? 'Used' : 'Available'}</span>
        </div>
        <div class="form-row">
          <label for="asset-search">Search assets</label>
          <input id="asset-search" class="input" placeholder="Search AAPL, FTSE, Gold..." />
        </div>
        <div class="form-row">
          <label for="trade-side">Trade type</label>
          <select id="trade-side" class="select">
            ${['BUY', 'SELL', 'LONG', 'SHORT', 'CLOSE'].map((side) => `<option value="${side}" ${state.selectedSide === side ? 'selected' : ''}>${side}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label for="trade-amount">Virtual amount</label>
          <input id="trade-amount" class="input" type="number" min="25" step="25" value="${state.selectedAmount}" />
        </div>
        <div class="trade-preview">
          <strong>${instrument.symbol} · ${instrument.name}</strong><br>
          <span class="muted">${instrument.assetClass} · ${instrument.market}</span><br>
          <span>Indicative price: <strong>${currency(quote.price)}</strong> <em class="${clsFor(quote.changePercent)}">${percent(quote.changePercent)}</em></span><br>
          <span>Estimated units: <strong>${(Number(state.selectedAmount || 0) / quote.price).toFixed(4)}</strong></span>
        </div>
        <button class="primary-button" id="confirm-trade" ${disabled ? 'disabled' : ''}>Confirm ${state.selectedSide} trade</button>
        <p class="disclaimer">Virtual market game only. Pricing source must be switched to a licensed provider before a public real-time market launch.</p>
      </article>

      <article class="panel">
        <div class="panel-header"><div><h2>Choose Market</h2><p>US, FTSE, indices, commodities and futures-style assets.</p></div></div>
        <div id="instrument-list" class="instrument-grid">
          ${instrumentButtons(state.instruments)}
        </div>
      </article>
    </section>
  `;
}

function instrumentButtons(instruments) {
  return instruments.map((instrument) => {
    const quote = demoQuote(instrument);
    return `<button class="instrument-button ${instrument.id === state.selectedInstrumentId ? 'active' : ''}" data-select-instrument="${instrument.id}">
      <strong>${instrument.symbol}</strong>
      <span>${instrument.name}</span>
      <span>${instrument.assetClass} · ${instrument.market}</span>
      <em class="${clsFor(quote.changePercent)}">${percent(quote.changePercent)}</em>
    </button>`;
  }).join('');
}

function leaderboardTable(rows, compact = false) {
  if (!rows.length) return '<p class="muted">No leaderboard entries yet.</p>';
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Rank</th><th>Player</th><th>Value</th><th>%</th>${compact ? '' : '<th>$</th><th>Days</th><th>W/L</th><th>Best</th><th>Worst</th>'}</tr></thead><tbody>
    ${rows.map((row) => `<tr>
      <td><span class="rank-pill">#${row.rank}</span></td>
      <td>${row.displayName}${row.userId === state.user?.id ? ' <span class="yellow">YOU</span>' : ''}</td>
      <td>${currency(row.portfolioValue)}</td>
      <td class="${clsFor(row.pnlPercent)}">${percent(row.pnlPercent)}</td>
      ${compact ? '' : `<td class="${clsFor(row.pnl)}">${currency(row.pnl)}</td><td>${row.daysTraded}</td><td>${row.daysGained}/${row.daysLost}</td><td class="positive">${currency(row.biggestGain)}</td><td class="negative">${currency(row.biggestLoss)}</td>`}
    </tr>`).join('')}
  </tbody></table></div>`;
}

function renderLeaderboard() {
  return `
    <section class="table-card">
      <div class="panel-header">
        <div>
          <h2>Stock-LENS League Leaderboard</h2>
          <p>Portfolio value, gain/loss stats, daily trade discipline and challenge record.</p>
        </div>
        <button class="ghost-button compact" id="refresh-leaderboard">Refresh</button>
      </div>
      ${leaderboardTable(state.leaderboard)}
    </section>
    <section class="table-card" style="margin-top:14px;">
      <div class="panel-header"><div><h2>Stock-TRUMPS Champions</h2><p>Side-game ranking.</p></div></div>
      ${challengeLeaderboardTable()}
    </section>
  `;
}

function challengeLeaderboardTable() {
  const rows = state.challengeLeaderboard || [];
  if (!rows.length) return '<p class="muted">No Stock-TRUMPS battles completed yet.</p>';
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Rank</th><th>Player</th><th>Played</th><th>Wins</th><th>Losses</th><th>Points</th></tr></thead><tbody>
    ${rows.map((row) => `<tr><td><span class="rank-pill">#${row.rank}</span></td><td>${row.userId === state.user?.id ? state.user.displayName : row.userId}</td><td>${row.played}</td><td class="positive">${row.wins}</td><td class="negative">${row.losses}</td><td>${row.points}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function renderTrumps() {
  const active = state.challenges.find((challenge) => challenge.status === 'active');
  return `
    <section class="grid cols-2">
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2>Stock-TRUMPS Arena</h2>
            <p>Top-Trumps style battles using market-card stats. XP only, no real-money prizes.</p>
          </div>
          <button class="primary-button compact" id="new-challenge">New bot battle</button>
        </div>
        ${active ? renderActiveChallenge(active) : '<p class="muted">No active challenge. Start one and pick the stat you think wins.</p>'}
        ${state.lastRound ? renderLastRound(state.lastRound) : ''}
      </article>
      <article class="panel">
        <div class="panel-header"><div><h2>Market Cards</h2><p>Today’s card deck.</p></div></div>
        <div class="card-grid">${state.trumpCards.slice(0, 6).map(renderTrumpCard).join('')}</div>
      </article>
    </section>
  `;
}

function renderTrumpCard(card) {
  return `<article class="trump-card">
    <h3>${card.symbol}</h3>
    <p class="sub">${card.name} · ${card.assetClass}</p>
    ${TRUMP_STATS.map((stat) => `<div class="stat-line"><span>${stat.label}</span><strong>${card.stats[stat.key]}</strong></div>`).join('')}
  </article>`;
}

function renderActiveChallenge(challenge) {
  const card = challenge.myNextCard;
  if (!card) return '<p class="muted">Challenge waiting for next round.</p>';
  return `<div class="challenge-card">
    <div class="panel-header">
      <div><h2>Round ${challenge.roundIndex + 1} / 5</h2><p>Score: ${challenge.myScore} - ${challenge.theirScore}</p></div>
      <span class="status-pill yellow">Choose stat</span>
    </div>
    <article class="trump-card">
      <h3>${card.symbol}</h3>
      <p class="sub">${card.name} · ${card.assetClass}</p>
      ${TRUMP_STATS.map((stat) => `<div class="stat-line"><button data-play-stat="${stat.key}" data-challenge-id="${challenge.id}"><span>${stat.label}</span><strong>${card.stats[stat.key]}</strong></button></div>`).join('')}
    </article>
  </div>`;
}

function renderLastRound(round) {
  return `<div class="trade-preview">
    <strong>Last round:</strong> ${round.chosenStatLabel}<br>
    ${round.playerCard.symbol} scored <strong>${round.playerValue}</strong> vs ${round.opponentCard.symbol} scored <strong>${round.opponentValue}</strong>.<br>
    <span class="${round.winnerSide === 'player' ? 'positive' : round.winnerSide === 'opponent' ? 'negative' : 'yellow'}">${round.winnerSide === 'draw' ? 'Draw' : round.winnerSide === 'player' ? 'You won the round' : 'Opponent won the round'}</span>
  </div>`;
}

function renderProfile() {
  const p = state.portfolio;
  return `
    <section class="grid cols-3">
      ${metricCard('Days Traded', p.stats.daysTraded, 'Daily discipline score')}
      ${metricCard('Days Gained', p.stats.daysGained, `${percent(p.stats.winRate)} win-rate`, 'positive')}
      ${metricCard('Days Lost', p.stats.daysLost, 'Red days happen', 'negative')}
      ${metricCard('Biggest Gain', currency(p.stats.biggestGain), 'Best daily settlement', 'positive')}
      ${metricCard('Biggest Loss', currency(p.stats.biggestLoss), 'Worst daily settlement', 'negative')}
      ${metricCard('Total Return', percent(p.pnlPercent), currency(p.pnl), clsFor(p.pnlPercent))}
    </section>

    <section class="grid cols-2" style="margin-top:14px;">
      <article class="profile-card">
        <div class="panel-header"><div><h2>Player Profile</h2><p>${state.user?.displayName || 'Trader'}</p></div><span class="status-pill ${state.fb.available ? 'green' : 'yellow'}">${state.fb.available ? 'Facebook' : 'PWA'}</span></div>
        <div class="form-row">
          <label for="display-name">Display name</label>
          <input class="input" id="display-name" value="${state.user?.displayName || ''}" />
        </div>
        <button class="primary-button" id="save-name">Save name</button>
        ${!state.fb.available && state.config.facebookAppId ? '<button class="secondary-button" id="facebook-signin" style="margin-top:10px;">Sign in with Facebook</button>' : ''}
        <button class="secondary-button" id="enable-push" style="margin-top:10px;">Enable trade reminders</button>
        <button class="ghost-button" id="settle-day" style="margin-top:10px;">Run daily settlement</button>
        ${state.config.facebookAppId ? '<p class="disclaimer">Facebook Login is enabled for the PWA. For public production use, verify Facebook tokens server-side before trusting the identity.</p>' : ''}
      </article>
      <article class="panel">
        <div class="panel-header"><div><h2>Facebook Group Link</h2><p>Keep the banter and weekly leaderboard drops in the group.</p></div></div>
        <a class="primary-button" href="${state.config.facebookGroupUrl}" target="_blank" rel="noopener" style="display:inline-flex;text-decoration:none;">Open Facebook Group</a>
        <button class="ghost-button" id="copy-group-post" style="margin-top:10px;">Copy weekly post text</button>
        <p class="disclaimer">The app links to your group as a community hub. It does not scrape, auto-read, or auto-post group content.</p>
      </article>
    </section>
  `;
}

function bindViewEvents(root = $('#view .view-screen.is-active') || $('#view')) {
  if (!root) return;
  $$('[data-select-instrument]', root).forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedInstrumentId = button.dataset.selectInstrument;
      if (button.dataset.route) {
        state.route = button.dataset.route;
        syncRouteToLocation();
      }
      render();
    });
  });
  $('#trade-side', root)?.addEventListener('change', (event) => { state.selectedSide = event.target.value; render(); });
  $('#trade-amount', root)?.addEventListener('input', (event) => { state.selectedAmount = Number(event.target.value || 0); });
  $('#asset-search', root)?.addEventListener('input', (event) => {
    const q = event.target.value.toLowerCase();
    const filtered = state.instruments.filter((instrument) => `${instrument.symbol} ${instrument.name} ${instrument.assetClass} ${instrument.market}`.toLowerCase().includes(q));
    $('#instrument-list', root).innerHTML = instrumentButtons(filtered);
    bindViewEvents(root);
  });
  $('#confirm-trade', root)?.addEventListener('click', confirmTrade);
  $('#refresh-leaderboard', root)?.addEventListener('click', refreshData);
  $('#new-challenge', root)?.addEventListener('click', newChallenge);
  $$('[data-play-stat]', root).forEach((button) => button.addEventListener('click', () => playStat(button.dataset.challengeId, button.dataset.playStat)));
  $('#download-card', root)?.addEventListener('click', downloadShareCard);
  $('#save-name', root)?.addEventListener('click', saveName);
  $('#facebook-signin', root)?.addEventListener('click', signInWithFacebook);
  $('#enable-push', root)?.addEventListener('click', enablePush);
  $('#settle-day', root)?.addEventListener('click', settleDay);
  $('#copy-group-post', root)?.addEventListener('click', copyGroupPost);
}

async function confirmTrade() {
  const body = { instrumentId: state.selectedInstrumentId, side: state.selectedSide, notional: Number(state.selectedAmount || 0) };
  try {
    if (state.offlineMode) {
      offlineTrade(body);
      toast('Trade locked into your local ledger. One and done.');
    } else {
      const result = await api('/api/trade', { method: 'POST', body });
      state.portfolio = result.after;
      state.leaderboard = result.leaderboard;
      writeLeaderboardCache(getPlayer(), state.leaderboard, state.challengeLeaderboard);
      toast('Trade confirmed and leaderboard refreshed.');
    }
    state.route = 'dashboard';
    syncRouteToLocation();
    if (window.FBInstant && window.FBInstant.updateAsync) {
      window.FBInstant.updateAsync({ action: 'CUSTOM', template: 'daily_trade', cta: 'Play', text: 'I made my daily Stock-LENS trade.', data: { route: 'leaderboard' }, strategy: 'IMMEDIATE', notification: 'NO_PUSH' }).catch(() => {});
    }
    render();
  } catch (error) {
    toast(error.message || 'Trade failed');
  }
}

function offlineTrade(body) {
  const data = loadOffline();
  const todaysTrades = data.trades.filter((trade) => trade.tradeDay === today()).length;
  if (todaysTrades >= 1) throw new Error('Daily trade already used. Come back tomorrow, you absolute market menace.');
  const instrument = LOCAL_INSTRUMENTS.find((item) => item.id === body.instrumentId);
  if (!instrument) throw new Error('Unknown instrument');
  const quote = demoQuote(instrument);
  const notional = Number(body.notional || 0);
  const side = body.side;
  let position = data.positions.find((pos) => pos.instrumentId === instrument.id);
  if (!position) {
    position = { instrumentId: instrument.id, quantity: 0, avgPrice: 0 };
    data.positions.push(position);
  }
  const qty = quote.price ? notional / quote.price : 0;
  if ((side === 'BUY' || side === 'LONG') && notional > data.cash) throw new Error('Insufficient virtual cash.');
  if (side === 'BUY' || side === 'LONG') {
    const oldAbs = Math.abs(position.quantity);
    position.avgPrice = oldAbs ? ((oldAbs * position.avgPrice) + (qty * quote.price)) / (oldAbs + qty) : quote.price;
    position.quantity += qty;
    data.cash -= notional;
  } else if (side === 'SELL') {
    if (position.quantity <= 0) throw new Error('No long position available to sell.');
    const sellQty = Math.min(position.quantity, qty);
    position.quantity -= sellQty;
    data.cash += sellQty * quote.price;
  } else if (side === 'SHORT') {
    position.avgPrice = position.avgPrice || quote.price;
    position.quantity -= qty;
    data.cash += notional;
  } else if (side === 'CLOSE') {
    data.cash += position.quantity * quote.price;
    position.quantity = 0;
    position.avgPrice = 0;
  }
  data.cash = roundMoney(data.cash);
  position.quantity = Math.round(position.quantity * 10000) / 10000;
  data.positions = data.positions.filter((pos) => Math.abs(pos.quantity) > 0.0001);
  data.trades.push({ id: `local_trade_${Date.now()}`, tradeDay: today(), createdAt: new Date().toISOString(), ...body, price: quote.price });
  saveOffline(data);
  refreshOfflineState();
}

async function refreshData() {
  await loadAppData();
  render();
  toast('Leaderboard refreshed.');
}

async function newChallenge() {
  try {
    if (state.offlineMode) {
      const data = loadOffline();
      const cards = offlineCards().sort((a, b) => hashNumber(`${a.id}:${Date.now()}`) - hashNumber(`${b.id}:${Date.now()}`));
      const challenge = { id: `local_challenge_${Date.now()}`, status: 'active', roundIndex: 0, myScore: 0, theirScore: 0, playerDeck: cards.slice(0, 5), opponentDeck: cards.slice(5, 10) };
      data.challenges.unshift(challenge);
      saveOffline(data);
      refreshOfflineState();
    } else {
      const result = await api('/api/challenges', { method: 'POST', body: {} });
      state.challenges.unshift(result.challenge);
    }
    toast('Stock-TRUMPS battle created. Pick your stat.');
    render();
  } catch (error) {
    toast(error.message || 'Could not create challenge');
  }
}

async function playStat(challengeId, stat) {
  try {
    if (state.offlineMode) {
      offlinePlayStat(challengeId, stat);
    } else {
      const result = await api(`/api/challenges/${encodeURIComponent(challengeId)}/play`, { method: 'POST', body: { stat } });
      const index = state.challenges.findIndex((challenge) => challenge.id === challengeId);
      if (index >= 0) state.challenges[index] = result.challenge;
      state.lastRound = result.round;
      state.challengeLeaderboard = result.challengeLeaderboard || state.challengeLeaderboard;
    }
    render();
  } catch (error) {
    toast(error.message || 'Round failed');
  }
}

function offlinePlayStat(challengeId, stat) {
  const data = loadOffline();
  const challenge = data.challenges.find((item) => item.id === challengeId);
  if (!challenge || challenge.status !== 'active') throw new Error('Challenge not active');
  const playerCard = challenge.playerDeck[challenge.roundIndex];
  const opponentCard = challenge.opponentDeck[challenge.roundIndex];
  const playerValue = playerCard.stats[stat];
  const opponentValue = opponentCard.stats[stat];
  let winnerSide = 'draw';
  if (playerValue > opponentValue) { challenge.myScore += 1; winnerSide = 'player'; }
  if (opponentValue > playerValue) { challenge.theirScore += 1; winnerSide = 'opponent'; }
  challenge.roundIndex += 1;
  if (challenge.roundIndex >= 5) {
    challenge.status = 'complete';
    challenge.winner = challenge.myScore >= challenge.theirScore ? 'player' : 'bot';
  }
  state.lastRound = {
    chosenStat: stat,
    chosenStatLabel: TRUMP_STATS.find((item) => item.key === stat)?.label || stat,
    playerCard,
    opponentCard,
    playerValue,
    opponentValue,
    winnerSide
  };
  saveOffline(data);
  refreshOfflineState();
}

function saveName() {
  const name = $('#display-name')?.value.trim().slice(0, 80);
  if (!name) return toast('Enter a display name first.');
  const player = getPlayer();
  player.displayName = name;
  savePlayer(player);
  if (state.offlineMode) refreshOfflineState();
  state.user.displayName = name;
  render();
  toast('Display name saved.');
}

async function enablePush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return toast('Push notifications are not supported in this browser.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return toast('Notifications not enabled.');
  const reg = await navigator.serviceWorker.ready;
  reg.showNotification('Stock-LENS reminders enabled', { body: 'You’ll be ready for daily trade nudges when server push is connected.', icon: '/assets/icon.svg' });
  try {
    await api('/api/notifications/subscribe', { method: 'POST', body: { subscription: { localPreview: true, grantedAt: new Date().toISOString() } } });
  } catch (_) {}
  toast('Trade reminders enabled on this device.');
}

async function settleDay() {
  try {
    if (state.offlineMode) {
      const data = loadOffline();
      const current = offlinePortfolio(data).portfolioValue;
      const previous = data.snapshots.length ? data.snapshots[data.snapshots.length - 1].portfolioValue : 1000;
      const existing = data.snapshots.find((snap) => snap.day === today());
      const snapshot = { day: today(), portfolioValue: current, dailyPnl: roundMoney(current - previous), dailyPnlPercent: previous ? ((current - previous) / previous) * 100 : 0 };
      if (existing) Object.assign(existing, snapshot); else data.snapshots.push(snapshot);
      saveOffline(data);
      refreshOfflineState();
    } else {
      const result = await api('/api/settle', { method: 'POST', body: {} });
      state.leaderboard = result.leaderboard;
      await loadAppData();
    }
    render();
    toast('Daily settlement updated.');
  } catch (error) {
    toast(error.message || 'Settlement failed');
  }
}

function copyGroupPost() {
  const p = state.portfolio;
  const row = state.leaderboard.find((item) => item.userId === state.user.id);
  const text = `📈 Mr.FLEN Stock-LENS Weekly Board\n\n${state.user.displayName} is currently #${row?.rank || '-'} with ${currency(p.portfolioValue)} (${percent(p.pnlPercent)}).\n\nOne trade per day. $1,000 virtual start. Charts lie. LENS don’t.\n\nJoin the league and call your shot.`;
  navigator.clipboard?.writeText(text);
  toast('Facebook Group post text copied.');
}

async function shareLeagueCard() {
  const p = state.portfolio;
  const text = `I’m ${percent(p.pnlPercent)} in Mr.FLEN Stock-LENS. One trade a day. In FLENS We Trust.`;
  if (window.FBInstant && window.FBInstant.shareAsync) {
    try {
      await window.FBInstant.shareAsync({ intent: 'SHARE', text, data: { route: 'leaderboard' } });
      return;
    } catch (_) {}
  }
  if (navigator.share) {
    try { await navigator.share({ title: 'Mr.FLEN Stock-LENS', text, url: location.href }); return; } catch (_) {}
  }
  await navigator.clipboard?.writeText(`${text} ${location.href}`);
  toast('Share text copied.');
}

function downloadShareCard() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  const p = state.portfolio;
  const rank = state.leaderboard.find((row) => row.userId === state.user?.id)?.rank || '-';
  const grad = ctx.createLinearGradient(0, 0, 1200, 1500);
  grad.addColorStop(0, '#071c32');
  grad.addColorStop(0.55, '#050b14');
  grad.addColorStop(1, '#02050a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 1500);
  ctx.strokeStyle = 'rgba(32,231,255,.5)';
  ctx.lineWidth = 6;
  ctx.strokeRect(54, 54, 1092, 1392);
  ctx.fillStyle = '#20e7ff';
  ctx.font = '900 72px Arial';
  ctx.fillText('Mr.FLEN', 90, 150);
  ctx.fillStyle = '#effbff';
  ctx.font = '900 96px Arial';
  ctx.fillText('STOCK-LENS', 90, 250);
  ctx.fillStyle = '#ffe06a';
  ctx.font = '700 34px Arial';
  ctx.fillText('ONE TRADE PER DAY · $1,000 VIRTUAL START', 90, 320);
  ctx.fillStyle = '#effbff';
  ctx.font = '900 130px Arial';
  ctx.fillText(`#${rank}`, 90, 520);
  ctx.font = '900 92px Arial';
  ctx.fillText(currency(p.portfolioValue), 90, 650);
  ctx.fillStyle = Number(p.pnlPercent) >= 0 ? '#35e879' : '#ff5f78';
  ctx.font = '900 76px Arial';
  ctx.fillText(`${percent(p.pnlPercent)} · ${currency(p.pnl)}`, 90, 760);
  ctx.fillStyle = '#effbff';
  ctx.font = '700 42px Arial';
  ctx.fillText(`Player: ${state.user.displayName}`, 90, 880);
  ctx.fillText(`Days traded: ${p.stats.daysTraded}`, 90, 950);
  ctx.fillText(`Days gained/lost: ${p.stats.daysGained}/${p.stats.daysLost}`, 90, 1020);
  ctx.fillText(`Stock-TRUMPS: ${p.stats.challengeWins}W / ${p.stats.challengeLosses}L`, 90, 1090);
  ctx.fillStyle = '#20e7ff';
  ctx.font = '900 48px Arial';
  ctx.fillText('CHARTS LIE. LENS DON’T.', 90, 1240);
  ctx.fillStyle = '#ffe06a';
  ctx.fillRect(770, 1190, 300, 160);
  ctx.fillStyle = '#101010';
  ctx.font = '900 38px Arial';
  ctx.fillText('IN FLENS', 810, 1255);
  ctx.fillText('WE TRUST', 810, 1310);
  const link = document.createElement('a');
  link.download = `stock-lens-card-${today()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.warn('SW registration failed', error);
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  const button = $('#install-button');
  if (button) button.hidden = false;
});

async function boot() {
  setProgress(8, 'Booting Stock-LENS...');
  getPlayer();
  handleLaunchParams();
  await registerServiceWorker();
  await initFacebookInstant();
  setProgress(76, 'Preparing your $1,000 bankroll...');
  await loadAppData();
  if (await initFacebookWebLogin()) {
    await loadAppData();
  }
  setProgress(100, 'Ready. Charts lie. LENS don’t.');
  await new Promise((resolve) => setTimeout(resolve, 260));
  state.ready = true;
  syncRouteToLocation(true);
  mountApp();
}

boot().catch((error) => {
  console.error(error);
  refreshOfflineState();
  mountApp();
  toast('Loaded in offline fallback mode.');
});
