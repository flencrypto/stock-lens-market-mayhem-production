# Deployment guide

## 1. Deploy the API/PWA server

### One-click VM startup via cloud-init

If your VM provider supports startup scripts, you can use:

```text
deploy/cloud-init.stocklens.yml
```

Before using it, edit these placeholders inside the file:

- `REPO_URL`
- `BRANCH`
- `DOMAIN`
- `EMAIL`

Optional production fields:

- `MARKET_PROVIDER` (`demo`, `yahoo`, or `licensed`)
- `MARKET_DATA_BASE_URL`
- `MARKET_DATA_API_KEY`

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

## 3. Facebook Instant Games deployment

### Build bundle

```bash
npm run build:instant
```

Generated file:

```text
dist/stock-lens-instant-game-upload.zip
```

### Bundle structure requirements

The Instant Games upload bundle is a ZIP with client assets at the ZIP root.

Required root files:

- `index.html` (entry point)
- `fbapp-config.json` (Instant Games config)

Typical structure:

```text
stock-lens-instant-game-upload.zip
|-- index.html
|-- fbapp-config.json
|-- app.js
|-- styles.css
|-- assets/
```

The existing `build:instant` script zips `public/` file contents directly, so `index.html` and `fbapp-config.json` stay at ZIP root.

### Upload method A: App Dashboard (manual)

1. Open your app in Meta App Dashboard.
2. Go to **Instant Games > Web Hosting** (or **Bundle Upload**).
3. Click **Upload Bundle** / **Upload Version**.
4. Upload `dist/stock-lens-instant-game-upload.zip`.
5. Wait for processing, then stage for testing or push to production.

### Upload method B: Graph API (programmatic)

Use this for CI/CD pipelines.

#### Step 1: request upload session ID

```bash
curl -i -X POST \
  "https://graph.facebook.com/v24.0/{app-id}/uploads?file_name={file-name}&file_length={file-length-in-bytes}&file_type=application/zip&access_token={user-access-token}"
```

#### Step 2: upload ZIP binary

Token namespace mapping:

- `GG...` token prefix -> `gg_graph_api`
- `EAA...` token prefix -> `fb_game_bundle` (includes System User tokens)

```bash
curl -i -X POST "https://rupload.facebook.com/{upload-namespace}/upload:{session-id}" \
  -H "Authorization: OAuth {access-token}" \
  -H "Offset: 0" \
  -H "X-Entity-Length: {file-length-in-bytes}" \
  -H "Content-Length: {file-length-in-bytes}" \
  -H "Type: BUNDLE" \
  -H "comment: Optional bundle upload comment" \
  -H "name: {file-name}" \
  --data-binary @./{file-name}
```

Notes:

- `Type: BUNDLE` is the required upload classification header for this rupload endpoint.
- Keep `content-length` and `X-Entity-Length` equal to the ZIP byte size.

#### Step 3 (optional): push uploaded bundle to production

```bash
curl -i -X POST "https://api.facebook.com/instant-games/assets/{app-id}/push-to-production" \
  -H "Content-Type: application/json" \
  -H "Authorization: OAuth {app-id}|{app-access-token}" \
  -H "X-API-Version: 1.0.0" \
  -d '{"bundle_instance_id": "{bundle-instance-id}"}'
```

Note: this push-to-production call uses the `api.facebook.com` endpoint as documented for the Instant Games assets API, while session creation uses `graph.facebook.com`.
Use the `bundle-instance-id` returned in the Step 2 upload response payload.
The authorization value here is intentionally an app access token in `{app-id}|{app-access-token}` format.

### Security and operations notes

- Never commit access tokens; use secret manager or CI/CD environment variables.
- For CI/CD, prefer a System User token (`EAA...`) because it does not expire.
- Max bundle size is 200 MB; recommended initial load is under 5 MB.
- If upload fails with authorization errors, verify token prefix and upload namespace match.

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
