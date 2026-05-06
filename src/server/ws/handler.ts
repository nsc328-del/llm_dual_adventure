import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { nanoid } from 'nanoid';
import { getDb } from '../db/connection.js';
import { addClient, removeClient, getRoomClients, sendTo, broadcastAll, type RoomClient } from './broadcast.js';
import type { ClientMessage } from '../../shared/ws-types.js';
import type { PlayerInfo, Room } from '../../shared/types.js';
import { startGame, processAction, triggerFinale, updateGenParams, updateSystemPrompt } from '../game/engine.js';
import { payloadSchemas } from '../../shared/schemas.js';

interface ClientState {
  ws: WebSocket;
  playerId: string | null;
  roomId: string | null;
  slot: (1 | 2) | null;
}

export async function registerWebSocket(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket) => {
    const state: ClientState = { ws: socket, playerId: null, roomId: null, slot: null };

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;
        handleMessage(state, msg);
      } catch {
        sendTo(socket, 'error', { code: 'PARSE_ERROR', message: 'Invalid message format' });
      }
    });

    socket.on('close', () => {
      if (state.roomId && state.playerId) {
        handleDisconnect(state);
      }
    });
  });
}

function handleMessage(state: ClientState, msg: ClientMessage) {
  const schema = payloadSchemas[msg.type];
  if (schema) {
    const result = schema.safeParse(msg.payload);
    if (!result.success) {
      sendTo(state.ws, 'error', {
        code: 'VALIDATION_ERROR',
        message: result.error.issues.map(i => i.message).join('; '),
      });
      return;
    }
    msg = { ...msg, payload: result.data } as ClientMessage;
  }

  switch (msg.type) {
    case 'ping':
      sendTo(state.ws, 'pong', {});
      break;
    case 'join_room':
      handleJoinRoom(state, msg.payload);
      break;
    case 'leave_room':
      if (state.roomId && state.playerId) handleLeaveRoom(state);
      break;
    case 'select_scenario':
      handleSelectScenario(state, msg.payload);
      break;
    case 'update_character':
      handleUpdateCharacter(state, msg.payload);
      break;
    case 'update_llm_config':
      handleUpdateLLMConfig(state, msg.payload);
      break;
    case 'ready':
      handleReady(state);
      break;
    case 'submit_action':
      handleSubmitAction(state, msg.payload);
      break;
    case 'vote_finale':
      handleVoteFinale(state);
      break;
    case 'update_gen_params':
      handleUpdateGenParams(state, msg.payload);
      break;
    case 'update_system_prompt':
      handleUpdateSystemPrompt(state, msg.payload);
      break;
    default:
      sendTo(state.ws, 'error', { code: 'NOT_IMPLEMENTED', message: `${(msg as any).type} not yet implemented` });
  }
}

function handleJoinRoom(state: ClientState, payload: { roomId: string; displayName: string; playerId?: string }) {
  const db = getDb();
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(payload.roomId) as any;
  if (!room) {
    sendTo(state.ws, 'error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  const existingPlayers = db.prepare('SELECT * FROM players WHERE room_id = ?').all(payload.roomId) as any[];

  // Reconnect check
  if (payload.playerId) {
    const existing = existingPlayers.find(p => p.id === payload.playerId);
    if (existing) {
      state.playerId = existing.id;
      state.roomId = payload.roomId;
      state.slot = existing.slot;

      db.prepare('UPDATE players SET connected = 1 WHERE id = ?').run(existing.id);
      addClient(payload.roomId, { ws: state.ws, playerId: existing.id, roomId: payload.roomId, slot: existing.slot });

      sendRoomState(state);
      broadcastAll(payload.roomId, 'player_reconnected', { slot: existing.slot });
      return;
    }
  }

  if (existingPlayers.length >= 2) {
    sendTo(state.ws, 'error', { code: 'ROOM_FULL', message: 'Room is full' });
    return;
  }

  const slot = existingPlayers.length === 0 ? 1 : (existingPlayers[0].slot === 1 ? 2 : 1);
  const playerId = nanoid(8);

  db.prepare(
    'INSERT INTO players (id, room_id, slot, display_name) VALUES (?, ?, ?, ?)'
  ).run(playerId, payload.roomId, slot, payload.displayName);

  if (existingPlayers.length === 0) {
    db.prepare("UPDATE rooms SET status = 'waiting' WHERE id = ?").run(payload.roomId);
  } else {
    db.prepare("UPDATE rooms SET status = 'setup' WHERE id = ?").run(payload.roomId);
  }

  state.playerId = playerId;
  state.roomId = payload.roomId;
  state.slot = slot as 1 | 2;

  addClient(payload.roomId, { ws: state.ws, playerId, roomId: payload.roomId, slot: slot as 1 | 2 });

  sendRoomState(state);

  broadcastAll(payload.roomId, 'player_joined', {
    player: {
      id: playerId,
      slot,
      displayName: payload.displayName,
      character: null,
      llmConfig: null,
      connected: true,
      ready: false,
    } satisfies PlayerInfo,
  });
}

function handleLeaveRoom(state: ClientState) {
  const db = getDb();
  if (state.roomId && state.playerId) {
    db.prepare('DELETE FROM players WHERE id = ?').run(state.playerId);
    removeClient(state.roomId, state.playerId);

    const remaining = db.prepare('SELECT COUNT(*) as count FROM players WHERE room_id = ?').get(state.roomId) as any;
    if (remaining.count === 0) {
      db.prepare('DELETE FROM rooms WHERE id = ?').run(state.roomId);
    } else {
      db.prepare("UPDATE rooms SET status = 'waiting' WHERE id = ?").run(state.roomId);
    }

    broadcastAll(state.roomId, 'player_left', { slot: state.slot });
    state.roomId = null;
    state.playerId = null;
    state.slot = null;
  }
}

function handleDisconnect(state: ClientState) {
  const db = getDb();
  if (state.roomId && state.playerId) {
    db.prepare('UPDATE players SET connected = 0 WHERE id = ?').run(state.playerId);
    removeClient(state.roomId, state.playerId);
    broadcastAll(state.roomId, 'player_left', { slot: state.slot });
  }
}

function handleSelectScenario(state: ClientState, payload: { scenarioId: string }) {
  if (!state.roomId) return;
  const db = getDb();
  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(payload.scenarioId) as any;
  if (!scenario) {
    sendTo(state.ws, 'error', { code: 'SCENARIO_NOT_FOUND', message: 'Scenario not found' });
    return;
  }

  db.prepare('UPDATE rooms SET scenario_id = ? WHERE id = ?').run(payload.scenarioId, state.roomId);

  const parsed = {
    ...scenario,
    characterTemplates: JSON.parse(scenario.character_templates),
    defaultTheme: scenario.default_theme,
    isPreset: !!scenario.is_preset,
  };

  broadcastAll(state.roomId, 'scenario_selected', { scenario: parsed });
}

function handleUpdateCharacter(state: ClientState, payload: { character: any }) {
  if (!state.roomId || !state.playerId) return;
  const db = getDb();
  db.prepare('UPDATE players SET character = ? WHERE id = ?').run(
    JSON.stringify(payload.character), state.playerId
  );
  broadcastAll(state.roomId, 'character_updated', { slot: state.slot, character: payload.character });
}

function handleUpdateLLMConfig(state: ClientState, payload: { config: any }) {
  if (!state.roomId || !state.playerId) return;
  const db = getDb();
  db.prepare('UPDATE players SET llm_config = ? WHERE id = ?').run(
    JSON.stringify(payload.config), state.playerId
  );
}

function handleReady(state: ClientState) {
  if (!state.roomId || !state.playerId) return;
  const db = getDb();

  const player = db.prepare('SELECT ready FROM players WHERE id = ?').get(state.playerId) as any;
  const newReady = player.ready ? 0 : 1;
  db.prepare('UPDATE players SET ready = ? WHERE id = ?').run(newReady, state.playerId);

  broadcastAll(state.roomId, 'player_ready', { slot: state.slot, ready: !!newReady });

  const players = db.prepare('SELECT * FROM players WHERE room_id = ?').all(state.roomId) as any[];
  if (players.length === 2 && players.every(p => p.ready)) {
    db.prepare("UPDATE rooms SET status = 'playing' WHERE id = ?").run(state.roomId);
    startGame(state.roomId);
  }
}

function handleSubmitAction(state: ClientState, payload: { action: string }) {
  if (!state.roomId || !state.slot) return;
  processAction(state.roomId, state.slot, payload.action);
}

function handleVoteFinale(state: ClientState) {
  if (!state.roomId) return;
  triggerFinale(state.roomId);
}

function handleUpdateGenParams(state: ClientState, payload: { params: any }) {
  if (!state.roomId) return;
  updateGenParams(state.roomId, payload.params);
}

function handleUpdateSystemPrompt(state: ClientState, payload: { prompt: string }) {
  if (!state.roomId) return;
  updateSystemPrompt(state.roomId, payload.prompt);
}

function sendRoomState(state: ClientState) {
  if (!state.roomId) return;
  const db = getDb();
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(state.roomId) as any;
  const players = db.prepare('SELECT * FROM players WHERE room_id = ?').all(state.roomId) as any[];

  let scenario = null;
  if (room.scenario_id) {
    const s = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(room.scenario_id) as any;
    if (s) {
      scenario = {
        ...s,
        characterTemplates: JSON.parse(s.character_templates),
        defaultTheme: s.default_theme,
        isPreset: !!s.is_preset,
      };
    }
  }

  const roomData: Room = {
    id: room.id,
    name: room.name,
    status: room.status,
    scenarioId: room.scenario_id,
    players: players.map(p => ({
      id: p.id,
      slot: p.slot,
      displayName: p.display_name,
      character: p.character ? JSON.parse(p.character) : null,
      llmConfig: null,
      connected: !!p.connected,
      ready: !!p.ready,
    })),
    createdAt: room.created_at,
  };

  let gameState = null;
  const gs = db.prepare('SELECT * FROM game_states WHERE room_id = ?').get(state.roomId) as any;
  if (gs) {
    gameState = {
      roomId: gs.room_id,
      currentTurn: gs.current_turn,
      activePlayer: gs.active_player,
      storyLog: JSON.parse(gs.story_log),
      generationParams: JSON.parse(gs.generation_params),
      systemPrompt: gs.system_prompt,
      status: gs.status,
    };
  }

  sendTo(state.ws, 'room_state', {
    room: roomData,
    gameState,
    scenario,
    playerId: state.playerId,
    slot: state.slot,
  });
}
