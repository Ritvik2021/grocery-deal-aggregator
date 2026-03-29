-- Grocery Deal Aggregator — Database Schema
-- Run with: psql $DATABASE_URL -f src/db/schema.sql

CREATE TABLE IF NOT EXISTS stores (
  id         SERIAL PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  logo_url   TEXT,
  flipp_id   INTEGER,
  source     TEXT NOT NULL DEFAULT 'flipp'
);

CREATE TABLE IF NOT EXISTS flyers (
  id           SERIAL PRIMARY KEY,
  store_id     INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  flipp_pub_id INTEGER UNIQUE NOT NULL,
  valid_from   DATE,
  valid_to     DATE,
  fetched_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  id             SERIAL PRIMARY KEY,
  flyer_id       INTEGER REFERENCES flyers(id) ON DELETE CASCADE,
  store_id       INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  external_id    TEXT,
  name           TEXT NOT NULL,
  description    TEXT,
  current_price  NUMERIC(8,2),
  original_price NUMERIC(8,2),
  savings        NUMERIC(8,2),
  savings_pct    NUMERIC(5,2),
  unit_size      TEXT,
  image_url      TEXT,
  category       TEXT,
  valid_from     DATE,
  valid_to       DATE,
  source         TEXT NOT NULL DEFAULT 'flipp',
  fetched_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, external_id, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_deals_store      ON deals(store_id);
CREATE INDEX IF NOT EXISTS idx_deals_valid_to   ON deals(valid_to);
CREATE INDEX IF NOT EXISTS idx_deals_savings_pct ON deals(savings_pct DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_deals_category   ON deals(category);
CREATE INDEX IF NOT EXISTS idx_deals_name_trgm  ON deals USING gin(to_tsvector('english', name));
