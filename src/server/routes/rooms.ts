import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { getDb } from '../db/connection.js';

export async function roomRoutes(app: FastifyInstance) {
  app.get('/api/rooms', async (req) => {
    const db = getDb();
    const local = (req.query as any).local;
    let rows;
    if (local === '1' || local === '0') {
      rows = db.prepare(
        `SELECT r.*, COUNT(p.id) as player_count
         FROM rooms r LEFT JOIN players p ON p.room_id = r.id
         WHERE r.status IN ('waiting', 'setup', 'playing', 'finished') AND r.is_local = ?
         GROUP BY r.id
         ORDER BY r.created_at DESC`
      ).all(local === '1' ? 1 : 0);
    } else {
      rows = db.prepare(
        `SELECT r.*, COUNT(p.id) as player_count
         FROM rooms r LEFT JOIN players p ON p.room_id = r.id
         WHERE r.status IN ('waiting', 'setup', 'playing', 'finished')
         GROUP BY r.id
         ORDER BY r.created_at DESC`
      ).all();
    }
    return rows;
  });

  app.post<{ Body: { name: string; isLocal?: boolean } }>('/api/rooms', async (req) => {
    const db = getDb();
    const id = nanoid(8);
    const name = req.body.name || `Room ${id}`;
    const isLocal = req.body.isLocal ? 1 : 0;
    db.prepare('INSERT INTO rooms (id, name, is_local) VALUES (?, ?, ?)').run(id, name, isLocal);
    return { id, name, status: 'waiting', is_local: isLocal, createdAt: new Date().toISOString() };
  });

  app.patch<{ Params: { id: string }; Body: { name: string } }>('/api/rooms/:id', async (req, reply) => {
    const db = getDb();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return reply.code(404).send({ error: 'Room not found' });
    db.prepare('UPDATE rooms SET name = ? WHERE id = ?').run(req.body.name, req.params.id);
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/api/rooms/:id', async (req, reply) => {
    const db = getDb();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return reply.code(404).send({ error: 'Room not found' });
    const players = db.prepare('SELECT * FROM players WHERE room_id = ?').all(req.params.id);
    return { ...room, players };
  });

  // Story archive endpoint
  app.get<{ Params: { id: string } }>('/api/rooms/:id/story', async (req, reply) => {
    const db = getDb();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
    if (!room) return reply.code(404).send({ error: 'Room not found' });

    const gameStateRow = db.prepare('SELECT * FROM game_states WHERE room_id = ?').get(req.params.id) as any;
    if (!gameStateRow) return reply.code(404).send({ error: 'No game state found' });

    const players = db.prepare('SELECT * FROM players WHERE room_id = ?').all(req.params.id) as any[];
    const playerInfos = players.map((p: any) => ({
      id: p.id,
      slot: p.slot,
      displayName: p.display_name,
      character: p.character ? JSON.parse(p.character) : null,
      llmConfig: null, // Don't expose LLM config
      connected: false,
      ready: false,
    }));

    let scenario = null;
    if (room.scenario_id) {
      const s = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(room.scenario_id) as any;
      if (s) {
        scenario = {
          id: s.id,
          name: s.name,
          genre: s.genre,
          description: s.description,
          worldLore: s.world_lore,
          tone: s.tone,
          openingPrompt: s.opening_prompt,
          characterTemplates: JSON.parse(s.character_templates),
          defaultTheme: s.default_theme,
          isPreset: !!s.is_preset,
        };
      }
    }

    return {
      roomName: room.name,
      roomId: room.id,
      status: gameStateRow.status,
      players: playerInfos,
      scenario,
      storyLog: JSON.parse(gameStateRow.story_log),
      createdAt: room.created_at,
    };
  });

  app.delete<{ Params: { id: string } }>('/api/rooms/:id', async (req, reply) => {
    const db = getDb();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return reply.code(404).send({ error: 'Room not found' });
    db.prepare('DELETE FROM game_states WHERE room_id = ?').run(req.params.id);
    db.prepare('DELETE FROM players WHERE room_id = ?').run(req.params.id);
    db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
    return { ok: true };
  });
}
