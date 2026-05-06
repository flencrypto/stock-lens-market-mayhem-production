# Deployment guide

## 1. Deploy the API/PWA server

The simplest production deployment is a Node.js host with persistent storage:

```bash
node server/server.js
```

Set environment variables in your host:

```text
PORT=8787
NODE_ENV=production
PUBLIC_BASE_URL=https://stocklens.yourdomain.com
FACEBOOK_GROUP_URL=https://www.facebook.com/groups/your-group
MARKET_PROVIDER=licensed
MARKET_DATA_BASE_URL=https://your-licensed-market-data-adapter
MARKET_DATA_API_KEY=your_key
CORS_ALLOW_ORIGIN=https://stocklens.yourdomain.com
```

### Free VM deployment with Docker + Caddy (recommended)

This repository includes a ready production stack for low-cost or free VM hosting:

- `docker-compose.production.yml` (app + Caddy)
- `deploy/Caddyfile` (automatic HTTPS with Let's Encrypt)
- `.env.production.example` (environment template)

Run on your VM:

```bash
cp .env.production.example .env.production
# Edit DOMAIN and EMAIL in .env.production
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

Check status:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production ps
curl https://your-domain.example/api/health
```

Testing mode should stay on demo pricing first:

```text
MARKET_PROVIDER=demo
```

When you are ready for production market data, switch to:

```text
MARKET_PROVIDER=licensed
MARKET_DATA_BASE_URL=https://your-licensed-data-provider.example
MARKET_DATA_API_KEY=replace_me
```

## 2. Move persistence to Postgres

The bundled runtime uses JSON persistence so the starter can run with no external packages.

For production scale, implement the schema in:

```text
db/schema.sql
```

Then replace `server/src/dataStore.js` with a Postgres repository layer.

## 3. Build and upload Facebook Instant Games bundle

```bash
npm run build:instant
```

Upload:

```text
dist/stock-lens-instant-game-upload.zip
```

The ZIP places `index.html` and `fbapp-config.json` at the root, as expected for an Instant Games web-hosted bundle.

## 4. App review essentials

Provide Meta with:

- Hosted URL or active build URL
- Testing instructions from `docs/META_REVIEW_NOTES.md`
- Privacy policy URL
- Terms URL
- Clarification that this is virtual trading only
- Clarification that the Facebook Group is a community link only

## 5. Push alerts

The service worker and subscription endpoint are present. To send production push alerts, add:

- VAPID key generation
- Web Push sender
- scheduled job for daily trade reminders
- challenge notification job

## 6. Data-source labels

Every market quote used for a trade should be snapshot-stored with:

- source
- source label
- delay status
- as-of timestamp
- captured-at timestamp

This is already implemented in the JSON store for trades.
