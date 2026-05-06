CREATE TABLE IF NOT EXISTS rooms (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'waiting',
  scenario_id   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL,
  slot          INTEGER NOT NULL,
  display_name  TEXT NOT NULL,
  character     TEXT,
  llm_config    TEXT,
  connected     INTEGER NOT NULL DEFAULT 1,
  ready         INTEGER NOT NULL DEFAULT 0,
  joined_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  UNIQUE(room_id, slot)
);

CREATE TABLE IF NOT EXISTS game_states (
  room_id       TEXT PRIMARY KEY,
  current_turn  INTEGER NOT NULL DEFAULT 0,
  active_player INTEGER NOT NULL DEFAULT 1,
  story_log     TEXT NOT NULL DEFAULT '[]',
  generation_params TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'setup',
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  genre               TEXT NOT NULL,
  description         TEXT NOT NULL,
  world_lore          TEXT NOT NULL,
  tone                TEXT NOT NULL,
  opening_prompt      TEXT NOT NULL,
  character_templates TEXT NOT NULL,
  default_theme       TEXT NOT NULL DEFAULT 'forest',
  is_preset           INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
