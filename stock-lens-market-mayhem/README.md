# Mr.FLEN Stock-LENS: Market Mayhem

Production-ready starter pack for a Facebook-linked, turn-based fantasy stock-market game.

Players start with **$1,000 virtual cash**, get **one trade per day**, climb a leaderboard, and can challenge each other in **Stock-TRUMPS** battles.

## What is included

- Facebook Instant Games-compatible static bundle files in `/public`
- PWA install support with `manifest.webmanifest` and service worker
- Node.js backend with no third-party dependencies
- Virtual portfolio engine
- One-trade-per-day enforcement
- Instrument universe covering US stocks, FTSE/UK names, indices, commodities and futures-style symbols
- Market-data provider abstraction
- Demo deterministic quote provider for local testing
- Optional Yahoo public chart provider for personal testing only
- Licensed-provider adapter placeholder for production market data
- Native wrappers for iOS, Android, and desktop (Electron)
- Server-backed leaderboard
- Stock-TRUMPS card battle engine
- Share-card PNG generator in the browser
- Push-notification subscription endpoint and service worker hooks
- Meta review notes and safe wording
- Production Postgres schema draft in `/db/schema.sql`

## Quick start

```bash
cd stock-lens-market-mayhem
node server/server.js
```

Open:

```text
http://localhost:8787
```

Run tests:

```bash
npm test
```

Reset local data:

```bash
npm run reset:data
```

Build Facebook Instant Game upload ZIP:

```bash
npm run build:instant
```

Run as desktop shell app (Windows/macOS/Linux):

```bash
npm run desktop
```

For iOS and Android wrapper setup, see:

```text
docs/NATIVE_APPS.md
```

The upload ZIP will be created at:

```text
dist/stock-lens-instant-game-upload.zip
```

## Production notes

### Market data

The default provider is:

```text
MARKET_PROVIDER=demo
```

That mode is deterministic and useful for testing. It is not real market data.

For personal testing with public Yahoo chart data, set:

```text
MARKET_PROVIDER=yahoo
```

The Yahoo adapter in this code calls:

```text
https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d
```

For production, use a licensed market-data provider and set:

```text
MARKET_PROVIDER=licensed
MARKET_DATA_BASE_URL=https://your-licensed-data-provider.example
MARKET_DATA_API_KEY=replace_me
```

The included `licensedQuote()` adapter expects a simple JSON response from your provider:

```json
{
  "price": 123.45,
  "previousClose": 120.00,
  "currency": "USD",
  "source": "licensed-provider-name",
  "sourceLabel": "Licensed real-time market data",
  "delayed": false,
  "asOf": "2026-05-05T04:00:00Z"
}
```

You can adapt `/server/src/marketData.js` to your provider’s exact API.

### Facebook Group integration

The app links to your Facebook Group as a community hub. It does **not** scrape group content, auto-read group posts, or auto-post into the group.

Recommended flow:

1. Pin a group post linking to the game.
2. Players join the league from the link.
3. Players generate share cards manually.
4. Admin posts weekly leaderboard graphics.
5. Stock-TRUMPS challenge links are shared manually.

### Facebook Instant Games

The Instant Games bundle requires:

- `index.html` at root
- `fbapp-config.json` at root
- Facebook Instant SDK initialization and fallback support

The app calls `FBInstant.initializeAsync()`, reports loading progress, and calls `FBInstant.startGameAsync()` when available. Outside Facebook, it runs as a normal PWA.

### Auth

This starter supports:

- Facebook Instant Games identity when inside the FB shell
- Local generated identity fallback for PWA/web testing

For a public production game, add a hardened session layer and verify signed platform payloads server-side.

### Real-money and compliance positioning

This game must be positioned as:

- virtual trading only
- no brokerage service
- no financial advice
- no real-money winnings
- no investment returns
- no gambling mechanics

Stock-TRUMPS rewards should stay as XP, badges, and cosmetics only.

## Folder structure

```text
stock-lens-market-mayhem/
  public/                  Facebook/PWA client bundle
  server/                  Node.js API server
  db/schema.sql            Production Postgres schema draft
  docs/                    Deployment/review notes
  scripts/                 Utility scripts
  data/                    Local JSON data store
  dist/                    Generated ZIP files
```

## Environment variables

Copy `.env.example` to `.env` and configure your deployment environment.

For a local no-dependency run, environment loading from `.env` is intentionally not built in. Set variables in your host/platform or shell.

Example:

```bash
PORT=8787 MARKET_PROVIDER=demo node server/server.js
```

## Production deployment checklist

- [ ] Deploy Node API behind HTTPS
- [ ] Replace demo provider with licensed market data
- [ ] Configure CORS to your real domain
- [ ] Add hardened auth/session validation
- [ ] Move from JSON store to Postgres using `/db/schema.sql`
- [ ] Add Redis or queue for scheduled settlements and notifications
- [ ] Add Web Push VAPID sender for daily trade alerts
- [ ] Configure Meta app dashboard and Instant Games upload
- [ ] Add privacy policy and terms URLs
- [ ] Add Meta review testing instructions
- [ ] Run tests before every build

## Disclaimer

This codebase is a game starter kit. It does not provide financial advice, brokerage services, investment recommendations, or real-money trading functionality.
