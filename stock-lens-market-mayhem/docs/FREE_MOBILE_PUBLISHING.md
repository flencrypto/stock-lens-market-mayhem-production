# Free mobile publishing plan (zero budget)

This guide focuses on publishing without paid app-store accounts.

## Reality check

- Google Play requires a one-time paid developer account.
- Apple App Store requires a paid annual developer account.

Fully free route:

- Android: distribute APK directly.
- iOS: ship as installable PWA (Add to Home Screen).

## 1) Host the app with HTTPS

Your app must be publicly accessible over HTTPS.

Set these env values on your host:

```text
NODE_ENV=production
PUBLIC_BASE_URL=https://your-domain.example
CORS_ALLOW_ORIGIN=https://your-domain.example
MARKET_PROVIDER=yahoo
```

## 2) Build Android APK (free distribution)

From project root:

```bash
npm install
npm run native:add:android
npm run native:build:android:debug
```

Output APK (default):

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Share APK through GitHub Releases, your website, Discord, or direct download.

## 3) iOS free route (PWA)

On iPhone:

1. Open your HTTPS app URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch from the home icon like a native app.

## 4) Point wrappers to hosted app

Before syncing native wrappers, set:

```text
NATIVE_APP_URL=https://your-domain.example
```

Then sync:

```bash
npm run native:sync
```

## 5) Optional paid store route later

When budget allows:

- Google Play: create account, build signed AAB in Android Studio, publish.
- Apple: join Apple Developer, archive in Xcode, upload via TestFlight/App Store Connect.
