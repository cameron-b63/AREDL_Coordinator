PRAGMA foreign_keys = OFF;

CREATE TABLE claims_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  level_id TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN (
    'begrudgingly_earmarked',
    'claimed',
    'locked_down',
    'supposedly_completed'
  )),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, level_id)
);

INSERT INTO claims_new (id, user_id, level_id, priority, created_at, updated_at)
SELECT id, user_id, level_id, priority, created_at, updated_at FROM claims;

DROP TABLE claims;

ALTER TABLE claims_new RENAME TO claims;

CREATE INDEX idx_claims_level ON claims(level_id);
CREATE INDEX idx_claims_user ON claims(user_id);

PRAGMA foreign_keys = ON;
