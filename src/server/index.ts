import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { runMigrations, closeDb } from './db/connection.js';
import { loadPresets } from './scenarios/loader.js';
import { roomRoutes } from './routes/rooms.js';
import { scenarioRoutes } from './routes/scenarios.js';
import { registerWebSocket } from './ws/handler.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

await app.register(roomRoutes);
await app.register(scenarioRoutes);
await app.register(registerWebSocket);

runMigrations();
loadPresets();

const shutdown = async () => {
  await app.close();
  closeDb();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ port: 9001, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
