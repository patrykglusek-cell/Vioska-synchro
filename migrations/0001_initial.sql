PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attacks (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  target TEXT NOT NULL,
  coordinates TEXT NOT NULL,
  notes TEXT NOT NULL,
  arrival TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS attacks_room ON attacks(room_id);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  attack_id TEXT NOT NULL REFERENCES attacks(id),
  player TEXT NOT NULL,
  units TEXT NOT NULL,
  seconds INTEGER NOT NULL CHECK(seconds > 0 AND seconds <= 604800),
  launch TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS participants_attack ON participants(attack_id);
