import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadPresets(): void {
  const db = getDb();
  const presetsDir = path.resolve(__dirname, 'presets');
  if (!fs.existsSync(presetsDir)) return;

  const files = fs.readdirSync(presetsDir).filter(f => f.endsWith('.json'));
  const insert = db.prepare(
    `INSERT OR IGNORE INTO scenarios (id, name, genre, description, world_lore, tone, opening_prompt, character_templates, default_theme, is_preset)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(presetsDir, file), 'utf-8'));
    insert.run(
      data.id,
      data.name,
      data.genre,
      data.description,
      data.worldLore,
      data.tone,
      data.openingPrompt,
      JSON.stringify(data.characterTemplates),
      data.defaultTheme,
    );
  }
}
