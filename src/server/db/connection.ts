import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    const dataDir = path.resolve(__dirname, '../../../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(path.join(dataDir, 'game.db'));
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

export function runMigrations(): void {
  const database = getDb();
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    database.exec(sql);
  }

  // Safe column additions for existing DBs
  const cols = database.prepare("PRAGMA table_info(rooms)").all() as any[];
  if (!cols.some((c: any) => c.name === 'is_local')) {
    database.exec("ALTER TABLE rooms ADD COLUMN is_local INTEGER NOT NULL DEFAULT 0");
  }
  // Fix legacy local rooms created before is_local flag
  database.exec("UPDATE rooms SET is_local = 1 WHERE name = '本地对战' AND is_local = 0");

  // Direction voting columns for game_states
  const gsCols = database.prepare("PRAGMA table_info(game_states)").all() as any[];
  if (!gsCols.some((c: any) => c.name === 'direction_votes')) {
    database.exec("ALTER TABLE game_states ADD COLUMN direction_votes TEXT");
  }
  if (!gsCols.some((c: any) => c.name === 'voted_players')) {
    database.exec("ALTER TABLE game_states ADD COLUMN voted_players TEXT");
  }
  if (!gsCols.some((c: any) => c.name === 'pending_directions')) {
    database.exec("ALTER TABLE game_states ADD COLUMN pending_directions TEXT");
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
