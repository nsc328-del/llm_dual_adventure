import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/connection.js';
import { loadPresets } from '../scenarios/loader.js';

export async function scenarioRoutes(app: FastifyInstance) {
  app.get('/api/scenarios', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM scenarios ORDER BY is_preset DESC, created_at ASC').all() as any[];
    return rows.map(row => ({
      ...row,
      characterTemplates: JSON.parse(row.character_templates),
      defaultTheme: row.default_theme,
      isPreset: !!row.is_preset,
    }));
  });

  app.get<{ Params: { id: string } }>('/api/scenarios/:id', async (req, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id) as any;
    if (!row) return reply.code(404).send({ error: 'Scenario not found' });
    return {
      ...row,
      characterTemplates: JSON.parse(row.character_templates),
      defaultTheme: row.default_theme,
      isPreset: !!row.is_preset,
    };
  });

  app.post('/api/scenarios', async (req) => {
    const db = getDb();
    const s = req.body as any;
    db.prepare(
      `INSERT INTO scenarios (id, name, genre, description, world_lore, tone, opening_prompt, character_templates, default_theme, is_preset)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(s.id, s.name, s.genre, s.description, s.worldLore, s.tone, s.openingPrompt, JSON.stringify(s.characterTemplates), s.defaultTheme);
    return s;
  });
}
