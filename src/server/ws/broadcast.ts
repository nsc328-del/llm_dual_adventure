import type { WebSocket } from 'ws';

export interface RoomClient {
  ws: WebSocket;
  playerId: string;
  roomId: string;
  slot: 1 | 2;
}

const rooms = new Map<string, Map<string, RoomClient>>();

export function addClient(roomId: string, client: RoomClient) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  rooms.get(roomId)!.set(client.playerId, client);
}

export function removeClient(roomId: string, playerId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(playerId);
  if (room.size === 0) rooms.delete(roomId);
}

export function getClient(roomId: string, playerId: string): RoomClient | undefined {
  return rooms.get(roomId)?.get(playerId);
}

export function getRoomClients(roomId: string): RoomClient[] {
  const room = rooms.get(roomId);
  return room ? Array.from(room.values()) : [];
}

export function broadcast(roomId: string, msg: object, excludePlayerId?: string) {
  const clients = getRoomClients(roomId);
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.playerId !== excludePlayerId && client.ws.readyState === client.ws.OPEN) {
      client.ws.send(data);
    }
  }
}

export function sendTo(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({
      type,
      payload,
      seq: Date.now(),
      timestamp: new Date().toISOString(),
    }));
  }
}

export function broadcastAll(roomId: string, type: string, payload: unknown) {
  const msg = { type, payload, seq: Date.now(), timestamp: new Date().toISOString() };
  broadcast(roomId, msg);
}
