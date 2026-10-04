-- The editor's generated avatar as JSON: {"seed": "...", "background": "..."} (see
-- lib/avatar/avatar-config.ts). NULL: the default avatar, seeded by the user id.
ALTER TABLE users ADD COLUMN avatar TEXT;
