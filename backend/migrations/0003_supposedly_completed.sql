DROP TABLE IF EXISTS claims;

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  level_id TEXT NOT NULL UNIQUE,
  priority TEXT NOT NULL CHECK (priority IN (
    'begrudgingly_earmarked',
    'claimed',
    'locked_down',
    'supposedly_completed'
  )),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_claims_level ON claims(level_id);
CREATE INDEX idx_claims_user ON claims(user_id);
