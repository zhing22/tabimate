-- Finished runs: one row per device, puzzle day and prompt. No personal data:
-- device_id is a random UUID the game keeps on the device. answer_id is NULL
-- for a miss; level is the puzzle file's hand-set level (0 for a miss).
CREATE TABLE IF NOT EXISTS runs (
  device_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  answer_id TEXT,
  level INT NOT NULL,
  created_at INT NOT NULL,
  PRIMARY KEY (device_id, date_key, prompt_id)
);

-- The day's stats: players per prompt and answer.
CREATE INDEX IF NOT EXISTS runs_by_answer ON runs (date_key, prompt_id, answer_id);
