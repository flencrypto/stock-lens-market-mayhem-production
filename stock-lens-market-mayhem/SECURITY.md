# Security notes

## Required before public launch

- Use HTTPS only.
- Replace local JSON persistence with Postgres or another managed database.
- Add real server-side session handling.
- Verify Facebook Instant Games signed context/player payloads where applicable.
- Rate-limit trade and challenge endpoints.
- Add audit logging to immutable storage.
- Protect admin settlement endpoints.
- Store API keys in secret manager / deployment environment only.
- Never expose licensed market-data API keys to the browser.
- Add monitoring for quote-provider failures and fallback states.

## Already included

- Trade ledger records price, source and timestamp.
- One-trade-per-day validation is server-side.
- Static path traversal protection is present.
- Request body size limit is present.
- CORS is configurable.
