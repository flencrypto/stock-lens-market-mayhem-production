# Native app wrappers (iOS, Android, Desktop)

This project now includes native wrappers around the existing web app.

## What was added

- Capacitor config for iOS and Android: `capacitor.config.ts`
- Electron desktop shell: `desktop/main.js`
- npm scripts for platform sync/add/open flows

The game logic and API stay in the current Node/web codebase.

## 1) Install dependencies

```bash
npm install
```

## 2) Run the app server

```bash
npm start
```

By default wrappers load:

```text
http://localhost:8787
```

You can target a hosted environment by setting env vars:

- `NATIVE_APP_URL` for Capacitor
- `APP_URL` for Electron

## 3) Desktop app (Windows/macOS/Linux)

Open in desktop shell:

```bash
npm run desktop
```

Open with a specific hosted URL:

```bash
npm run desktop:url
```

## 4) Android app

Initialize/sync native project:

```bash
npm run native:add:android
npm run native:sync
```

Open in Android Studio:

```bash
npm run native:open:android
```

Build a debug APK from CLI:

```bash
npm run native:build:android:debug
```

Build/sign from Android Studio for Play Store or internal distribution.

## 5) iOS app

Initialize/sync native project:

```bash
npm run native:add:ios
npm run native:sync
```

Open in Xcode:

```bash
npm run native:open:ios
```

Build/sign from Xcode for TestFlight/App Store.

## Notes

- iOS builds require macOS + Xcode.
- Android builds require Android Studio SDK setup.
- Capacitor wrappers point to your running app URL. For offline-first packaging, migrate to a static frontend build output and set `webDir` to that build directory.

For zero-budget Android+iOS release options, see:

```text
docs/FREE_MOBILE_PUBLISHING.md
```
