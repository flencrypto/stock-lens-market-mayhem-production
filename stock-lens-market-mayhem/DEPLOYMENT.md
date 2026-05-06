# Deployment Guide: PWA, Vercel & Netlify

## Progressive Web App (PWA)

The Stock-LENS game is fully PWA-enabled with offline support, installability, and native-like experience.

### PWA Features
- **Service Worker**: Offline-first caching strategy (`public/sw.js`)
- **Web App Manifest**: App metadata, icons, shortcuts (`public/manifest.webmanifest`)
- **Install Prompt**: Add-to-home-screen on iOS/Android/desktop
- **Push Notifications**: Ready for Web Push API integration
- **App Shortcuts**: Quick access to Trade, Leaderboard

### Browser Support
- **Desktop**: Chrome, Edge, Firefox, Opera
- **iOS**: Safari 15.1+ (PWA mode in home screen)
- **Android**: Chrome, Firefox, Samsung Internet

### Test PWA Locally
```bash
npm start
# Open https://localhost:8787 in Chrome DevTools → Application → Manifest
# Install via browser: "Install app" button or context menu
```

---

## Vercel Deployment

Vercel provides serverless Node.js hosting with automatic deployments and global CDN.

### Quick Start
```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

### Configuration (vercel.json)
- **Routes**: API calls → Node.js serverless functions, static files → CDN
- **Headers**: Service worker, manifest, and asset caching rules
- **Environment**: Reads from `.env` file (NOT committed; add in Vercel dashboard)

### Vercel Dashboard Setup
1. Link GitHub repo to Vercel
2. Add environment variables: `PORT`, `NODE_ENV`, `PUBLIC_BASE_URL`, `MARKET_PROVIDER`, etc.
3. Deploy triggers automatically on git push to `main`

### Production URL
```
https://stock-lens-market-mayhem.vercel.app
```

---

## Netlify Deployment

Netlify provides static + serverless hybrid with fine-grained control and form handling.

### Quick Start
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Configuration (netlify.toml)
- **Build**: Runs `npm run build:instant` to bundle frontend + server
- **Functions**: Serverless API wrapper in `netlify/functions/api.js`
- **Redirects**: SPA routing + API proxying
- **Headers**: Security, caching, and PWA headers

### Netlify Dashboard Setup
1. Connect GitHub repo to Netlify
2. Add build command: `npm run build:instant`
3. Add publish directory: `public`
4. Add environment variables in Site Settings → Build & Deploy → Environment
5. Deploy triggers automatically on git push to `main`

### Production URL
```
https://stock-lens-market-mayhem.netlify.app
```

---

## Environment Variables Needed

Copy these to your deployment platform's environment settings:

```bash
# Required
PORT=8787
NODE_ENV=production
PUBLIC_BASE_URL=https://your-domain.example
MARKET_PROVIDER=demo  # or 'yahoo', or 'licensed'

# Optional
APP_NAME=Mr.FLEN Stock-LENS
STARTING_BALANCE=1000
DAILY_TRADE_LIMIT=1
FACEBOOK_GROUP_URL=https://www.facebook.com/groups/your-group-id
SESSION_COOKIE_NAME=stocklens_session
CORS_ALLOW_ORIGIN=https://your-domain.example

# For licensed data provider only
MARKET_DATA_BASE_URL=https://api.your-data-provider.example
MARKET_DATA_API_KEY=your-secret-key-here
```

---

## Platform Comparison

| Feature | Vercel | Netlify | Local |
|---------|--------|---------|-------|
| Deployments | Git auto-push | Git auto-push | Manual |
| Serverless | ✅ Native | ✅ Functions | ❌ |
| Static CDN | ✅ Global | ✅ Global | ❌ |
| PWA Support | ✅ | ✅ | ✅ |
| Cost | Pay-per-use | Free tier + pro | ❌ |
| Cold starts | ~200ms | ~500ms | N/A |

---

## Health Checks

After deploying, verify PWA + API:

```bash
# Check health endpoint
curl https://your-domain.example/api/health

# Check manifest
curl https://your-domain.example/manifest.webmanifest

# Check service worker
curl https://your-domain.example/sw.js
```

Expected responses:
- `/api/health`: `{ "ok": true, "app": "Mr.FLEN Stock-LENS", "env": "production" }`
- `/manifest.webmanifest`: Valid JSON with icons and shortcuts
- `/sw.js`: Service Worker source code (must be cacheable with `must-revalidate`)

---

## Troubleshooting

### PWA Not Installable
- Check manifest is served with `Content-Type: application/manifest+json`
- Check service worker is registered in `public/app.js`
- Test in Chrome DevTools → Application → Manifest tab

### API 404 Errors on Vercel/Netlify
- Verify environment variables are set
- Check `/api/health` returns 200
- Verify build command completed successfully

### Cache Issues
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh service worker: DevTools → Application → Service Workers → Unregister
- Or visit `about://version` and check service worker status

### Cold Start Timeouts
- Vercel: ~200ms typical
- Netlify: ~500ms typical
- If API takes >10s, check Node server startup time and dependencies

---

## Next Steps

1. **Custom Domain**: Point DNS A record to Vercel/Netlify nameservers
2. **SSL Cert**: Auto-issued by both platforms (free)
3. **Monitoring**: Enable Sentry, Datadog, or CloudFlare for errors + analytics
4. **Performance**: Use Lighthouse & WebPageTest to benchmark PWA scores
5. **Push Notifications**: Integrate Web Push API with service worker backend
