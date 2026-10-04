-- Immutable snapshots of the global variables, one per commit that changed them. Globals
-- are committed with pages (same `commits` row), so History can show and recover them.
CREATE TABLE globals_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL CHECK (json_valid(content) AND json_type(content) = 'object'),
  content_format_version INTEGER NOT NULL DEFAULT 1 CHECK (content_format_version >= 1),
  commit_id TEXT REFERENCES commits (id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX globals_history_commit_id_idx ON globals_history (commit_id);

-- Globals saved before this migration had no history. Keep what is live now as the
-- starting point (no commit, so History doesn't list it), so the first commit that
-- changes globals is diffed against it instead of shown as creating them.
INSERT INTO globals_history (content, content_format_version, created_by, created_at)
SELECT content, content_format_version, updated_by, updated_at FROM globals;
