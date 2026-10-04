-- Capsulo CMS schema for Cloudflare D1 (SQLite).
-- Timestamps are ISO-8601 UTC strings (strftime below) so they sort lexically and
-- match what the admin already parses. JSON documents are stored as TEXT.

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  -- Salts the fake login challenge for unknown users so the API does not reveal
  -- which logins exist. Generated here so no Worker secret has to be managed.
  instance_secret TEXT NOT NULL
);

INSERT INTO settings (id, instance_secret) VALUES (1, lower(hex(randomblob(32))));

-- Editors. Created and managed with `capsulo users` (no sign-up, no emails).
-- The browser stretches the password with PBKDF2 (`kdf_iterations`, `salt`) and the
-- Worker only compares SHA-256(stretched key) to `verifier`, which fits the free
-- plan's 10 ms CPU budget.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT COLLATE NOCASE,
  name TEXT,
  avatar_url TEXT,
  salt TEXT NOT NULL,
  verifier TEXT NOT NULL,
  kdf_iterations INTEGER NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  disabled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Only the SHA-256 of the session token is stored; the token lives in an HttpOnly cookie.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- Current published document for each page_id in the Page Editor.
CREATE TABLE pages (
  page_id TEXT PRIMARY KEY,
  content TEXT NOT NULL CHECK (json_valid(content) AND json_type(content) = 'object'),
  content_format_version INTEGER NOT NULL DEFAULT 1 CHECK (content_format_version >= 1),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Immutable commit metadata grouping the page revisions written together.
CREATE TABLE commits (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX commits_created_at_idx ON commits (created_at DESC);

-- Immutable snapshots of page content, one per page per commit.
CREATE TABLE pages_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id TEXT NOT NULL REFERENCES pages (page_id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (json_valid(content) AND json_type(content) = 'object'),
  content_format_version INTEGER NOT NULL DEFAULT 1 CHECK (content_format_version >= 1),
  comment TEXT,
  commit_id TEXT REFERENCES commits (id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX pages_history_page_id_idx ON pages_history (page_id, id DESC);
CREATE INDEX pages_history_commit_id_idx ON pages_history (commit_id);

-- Site-wide global variables document for the CMS (single row).
CREATE TABLE globals (
  id TEXT PRIMARY KEY DEFAULT 'globals' CHECK (id = 'globals'),
  content TEXT NOT NULL CHECK (json_valid(content) AND json_type(content) = 'object'),
  content_format_version INTEGER NOT NULL DEFAULT 1 CHECK (content_format_version >= 1),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Metadata for files whose bytes live in the UPLOADS KV namespace (key = KV key).
CREATE TABLE uploads (
  key TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
