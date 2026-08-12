-- Groups workflow (join policies, roles, pending requests) and per-challenge
-- streaks. Adds columns to existing tables, so unlike schema.sql this file is
-- NOT safe to re-run: D1/SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT
-- EXISTS`, and running the ALTERs twice fails with "duplicate column name".
-- Run this once against the live database, then never again. Fresh installs
-- get the same shape straight from schema.sql instead.
--
--   wrangler d1 execute <DB_NAME> --remote --file=./migrations/002-groups-and-challenge-streaks.sql

ALTER TABLE groups ADD COLUMN join_policy TEXT NOT NULL DEFAULT 'approval';
ALTER TABLE group_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
ALTER TABLE group_members ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS challenge_streaks (
  user_id          TEXT NOT NULL REFERENCES users(id),
  challenge        TEXT NOT NULL,
  streak           INTEGER NOT NULL DEFAULT 0,
  best_streak      INTEGER NOT NULL DEFAULT 0,
  total_days       INTEGER NOT NULL DEFAULT 0,
  last_logged_date TEXT,
  PRIMARY KEY (user_id, challenge)
);

CREATE INDEX IF NOT EXISTS idx_challenge_streaks_challenge ON challenge_streaks(challenge);

-- The global feed is special-cased in application code (no owner, always
-- open), but give it the same join_policy value for consistency with what
-- fresh installs get from schema.sql.
UPDATE groups SET join_policy = 'open' WHERE is_global = 1;

-- Every existing group's creator becomes its owner. SQLite supports a row
-- value on the left of IN, matching (group_id, user_id) pairs in one pass
-- instead of a per-group update.
UPDATE group_members
SET role = 'owner'
WHERE (group_id, user_id) IN (
  SELECT id, created_by FROM groups WHERE created_by IS NOT NULL
);

-- The app used to post the challenge's display name ("Tefillin", "Shabbat")
-- instead of its bare lowercase id. The contract unifies on the lowercase id
-- everywhere (DB, API, challengeStreaks keys), so normalize historical rows
-- to match. lower() is idempotent, so this is harmless if already lowercase.
UPDATE posts SET challenge = lower(challenge);

-- Seed challenge_streaks from the existing overall streak columns. Tefillin
-- is the only challenge that has ever been logged, so every user's current
-- streak state becomes their 'tefillin' row.
INSERT INTO challenge_streaks (user_id, challenge, streak, best_streak, total_days, last_logged_date)
SELECT id, 'tefillin', streak, best_streak, total_days, last_logged_date FROM users;

-- Give every existing non-global group an invite code if it does not already
-- have one (fresh groups get one from application code, using the alphabet
-- in the API contract — ABCDEFGHJKLMNPQRSTUVWXYZ23456789 — but a plain SQL
-- UPDATE can't easily reject collisions or restrict to that exact alphabet,
-- so this backfill uses hex instead; fine for the handful of pre-existing
-- rows this runs against once, and collisions are astronomically unlikely).
UPDATE groups
SET invite_code = upper(substr(hex(randomblob(8)), 1, 6))
WHERE is_global = 0 AND (invite_code IS NULL OR invite_code = '');
