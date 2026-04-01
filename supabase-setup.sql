-- Run this in your Supabase project:
-- Dashboard → SQL Editor → New Query → paste → Run

-- 1. Licenses table (admin creates these)
CREATE TABLE IF NOT EXISTS licenses (
  code        TEXT PRIMARY KEY,
  expiry      DATE NOT NULL,
  max_devices INT  NOT NULL DEFAULT 1,
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activations table (app writes to this)
CREATE TABLE IF NOT EXISTS activations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_code TEXT NOT NULL REFERENCES licenses(code) ON DELETE CASCADE,
  machine_id   TEXT NOT NULL,
  machine_name TEXT NOT NULL DEFAULT '',
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(license_code, machine_id)
);

-- 3. Row Level Security — allow the anon key to read/write
ALTER TABLE licenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

-- Licenses: anon can read (to validate codes), but NOT insert/update/delete
-- (only you insert via the admin dashboard or SQL)
CREATE POLICY "anon read licenses"
  ON licenses FOR SELECT USING (true);

-- Activations: anon can read, insert, and update last_seen (but not delete)
CREATE POLICY "anon read activations"
  ON activations FOR SELECT USING (true);

CREATE POLICY "anon insert activations"
  ON activations FOR INSERT WITH CHECK (true);

CREATE POLICY "anon update last_seen"
  ON activations FOR UPDATE USING (true);
