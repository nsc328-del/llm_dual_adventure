import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { getDb } from '../db/connection.js';

export async function roomRoutes(app: FastifyInstance) {
  app.get('/api/rooms', async (req) => {
    const db = getDb();
    const local = (req.query as any).local;
    const isLocal = local === '1' ? 1 : local === '0' ? 0 : undefined;
    const where = isLocal !== undefined
      ? `WHERE r.status IN ('waiting', 'setup', 'playing') AND r.is_local = ${isLocal}`
      : `WHERE r.status IN ('waiting', 'setup', 'playing')`;
    const rows = db.prepare(
      `SELECT r.*, COUNT(p.id) as player_count
       FROM rooms r LEFT JOIN players p ON p.room_id = r.id
       ${where}
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    ).all();
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
