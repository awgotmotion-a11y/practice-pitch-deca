-- D1 database "pitchprep". Apply with: npx wrangler d1 execute pitchprep --remote --file schema.sql
-- Members are added from the Members page (admins only), never committed here.
-- pw is "salt.hash" (PBKDF2-SHA256, 100k rounds); invite and sessions.token hold SHA-256 hashes, never the raw tokens.
CREATE TABLE IF NOT EXISTS members (
  email TEXT PRIMARY KEY, name TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0, added INTEGER NOT NULL,
  pw TEXT, invite TEXT, invite_expires INTEGER NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_email ON sessions (email);
CREATE TABLE IF NOT EXISTS data (email TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (email, key));
