-- Mr.FLEN Stock-LENS production Postgres schema draft
-- Replace the starter JSON store with this schema for production scale.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  starting_balance NUMERIC(18, 2) NOT NULL DEFAULT 1000,
  daily_trade_limit INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

CREATE TABLE instruments (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  market TEXT NOT NULL,
  sector TEXT,
  currency TEXT NOT NULL,
  provider_symbol TEXT
);

CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cash NUMERIC(18, 4) NOT NULL DEFAULT 1000,
  starting_balance NUMERIC(18, 2) NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL REFERENCES instruments(id),
  quantity NUMERIC(24, 8) NOT NULL DEFAULT 0,
  avg_price NUMERIC(18, 6) NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id, instrument_id)
);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL REFERENCES instruments(id),
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL', 'LONG', 'SHORT', 'CLOSE')),
  notional NUMERIC(18, 4) NOT NULL,
  quantity_delta NUMERIC(24, 8) NOT NULL,
  price NUMERIC(18, 6) NOT NULL,
  price_source TEXT NOT NULL,
  price_source_label TEXT,
  trade_day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX trades_one_trade_per_day_idx
  ON trades (league_id, user_id, trade_day);

CREATE TABLE price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id TEXT NOT NULL REFERENCES instruments(id),
  symbol TEXT NOT NULL,
  price NUMERIC(18, 6) NOT NULL,
  source TEXT NOT NULL,
  source_label TEXT,
  delayed BOOLEAN NOT NULL DEFAULT false,
  as_of TIMESTAMPTZ NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

CREATE TABLE daily_portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  portfolio_value NUMERIC(18, 4) NOT NULL,
  daily_pnl NUMERIC(18, 4) NOT NULL,
  daily_pnl_percent NUMERIC(10, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id, day)
);

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  round_index INT NOT NULL DEFAULT 0,
  player_score INT NOT NULL DEFAULT 0,
  opponent_score INT NOT NULL DEFAULT 0,
  player_deck JSONB NOT NULL,
  opponent_deck JSONB NOT NULL,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE challenge_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  chosen_stat TEXT NOT NULL,
  player_card JSONB NOT NULL,
  opponent_card JSONB NOT NULL,
  player_value INT NOT NULL,
  opponent_value INT NOT NULL,
  winner_side TEXT NOT NULL CHECK (winner_side IN ('player', 'opponent', 'draw')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint_hash TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint_hash)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
