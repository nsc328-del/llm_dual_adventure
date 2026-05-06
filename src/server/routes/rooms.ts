import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { getDb } from '../db/connection.js';

export async function roomRoutes(app: FastifyInstance) {
  app.get('/api/rooms', async () => {
    const db = getDb();
    const rows = db.prepare(
      `SELECT r.*, COUNT(p.id) as player_count
       FROM rooms r LEFT JOIN players p ON p.room_id = r.id
       WHERE r.status IN ('waiting', 'setup')
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    ).all();
    return rows;
  });

  app.post<{ Body: { name: string } }>('/api/rooms', async (req) => {
    const db = getDb();
    const id = nanoid(8);
    const name = req.body.name || `Room ${id}`;
    db.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)').run(id, name);
    return { id, name, status: 'waiting', createdAt: new Date().toISOString() };
  });

  app.get<{ Params: { id: string } }>('/api/rooms/:id', async (req, reply) => {
    const db = getDb();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return reply.code(404).send({ error: 'Room not found' });
    const players = db.prepare('SELECT * FROM players WHERE room_id = ?').all(req.params.id);
    return { ...room, players };
  });
}
