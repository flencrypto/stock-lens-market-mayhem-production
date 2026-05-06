# Meta review notes — Mr.FLEN Stock-LENS: Market Mayhem

## App access

The app can be accessed from the hosted URL you deploy, or from the uploaded Facebook Instant Games build.

Local test URL:

```text
http://localhost:8787
```

## Reviewer test flow

1. Open the app URL or launch the active Instant Games build.
2. Wait for the Stock-LENS loading screen.
3. Confirm the dashboard loads with a $1,000 virtual starting balance.
4. Go to **Trade**.
5. Select an asset such as AAPL, NVDA, FTSE 100, Gold or Oil.
6. Submit one virtual trade.
7. Confirm the app blocks a second same-day trade.
8. Go to **Leaderboard** and confirm the portfolio appears.
9. Go to **Stock-TRUMPS**.
10. Create a bot battle.
11. Pick a stat for each round and confirm the challenge resolves.
12. Use the **Share** or **Download card** option to create a shareable result.

## Facebook Login / Meta API confirmation

This app does not use Facebook Login for external website authentication in the review build and does not request advanced Facebook Login permissions such as email, user_friends, user_gender, user_birthday, or similar data permissions.

The app uses the Facebook Instant Games SDK only for platform functionality when running inside the Facebook Instant Games shell:

- initialization
- loading progress
- start-game flow
- optional share/update hooks
- platform player display identity where available

The app is designed to run under a zero-permissions model.

## Payment / membership

No payment, subscription, membership, access code, or login is required to access the submitted functionality.

All core gameplay features are available immediately.

## Financial services clarification

Mr.FLEN Stock-LENS is a virtual market game. It does not offer:

- brokerage services
- investment advice
- real-money trading
- real-money withdrawals
- financial returns
- gambling prizes

All balances are virtual game balances.
