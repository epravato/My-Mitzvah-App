-- Tefillin Challenge database (Cloudflare D1, which is SQLite under the hood).
--
-- Safe to run more than once. Every statement is "IF NOT EXISTS", so re-running
-- this file will not wipe anything that is already there.

-- One row per person with an account.
-- The password itself is never stored. See backend/src/passwords.js for why.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,

  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,

  -- Streak state lives on the server now, so it cannot be edited by anyone
  -- poking at the phone's storage.
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_days INTEGER NOT NULL DEFAULT 0,
  goal_days INTEGER NOT NULL DEFAULT 40,
  last_logged_date TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Emails are compared lowercased everywhere, so the uniqueness check has to be
-- case insensitive too. Otherwise Ethan@x.com and ethan@x.com become two accounts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- One row per active login. We store a fingerprint of the token, never the token,
-- so a copy of this table cannot be used to log in as anyone.
CREATE TABLE IF NOT EXISTS sessions (
  token_fingerprint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  -- SQLite has no real boolean. 0 is false, 1 is true.
  is_global INTEGER NOT NULL DEFAULT 0,
  invite_code TEXT UNIQUE,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Who is in which group. The two columns together are the primary key, so the
-- same person cannot join the same group twice.
CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL REFERENCES groups(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT NOT NULL REFERENCES groups(id),
  challenge TEXT NOT NULL,
  caption TEXT,

  -- photo_key is where the R2 photo will live once photo upload is built.
  -- The column exists now so adding photos later needs no schema change.
  photo_key TEXT,
  photo_tint TEXT,

  streak_at_post INTEGER,
  -- The poster's own local day, "YYYY-MM-DD". Sent by the app, because only the
  -- phone knows what "today" means where the person actually is.
  day_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_group_created ON posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- The one group everybody is in automatically. Fixed id so the code can always
-- find it without a lookup by name.
INSERT OR IGNORE INTO groups (id, name, description, is_global, invite_code)
VALUES ('group-global', 'Global Feed', 'Everyone using the app', 1, NULL);
