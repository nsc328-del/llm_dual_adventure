import { nanoid } from 'nanoid';
import { getDb } from '../db/connection.js';
import { getAdapter } from '../llm/factory.js';
import { buildSystemPrompt, buildMessages, buildOpeningMessages, buildReviewMessages } from './narrator.js';
import { broadcastAll, getRoomClients, sendTo } from '../ws/broadcast.js';
import { REVIEW_INTERVAL, DEFAULT_GEN_PARAMS } from '../../shared/constants.js';
import type { GameState, StoryEntry, Scenario, PlayerInfo, LLMConfig, GenerationParams } from '../../shared/types.js';

const generatingRooms = new Set<string>();

export function parseSuggestions(content: string): { narration: string; suggestions: string[] } {
  const idx = content.indexOf('---SUGGESTIONS---');
  if (idx === -1) return { narration: content.trim(), suggestions: [] };

  const narration = content.slice(0, idx).trim();
  const suggestionsRaw = content.slice(idx + '---SUGGESTIONS---'.length).trim();
  const suggestions = suggestionsRaw
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  return { narration, suggestions };
}

export function parseDirections(content: string): { review: string; directions: string[] } {
  const idx = content.indexOf('---DIRECTIONS---');
  if (idx === -1) return { review: content.trim(), directions: [] };
  const review = content.slice(0, idx).trim();
  const directionsRaw = content.slice(idx + '---DIRECTIONS---'.length).trim();
  const directions = directionsRaw
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
  return { review, directions };
}

function getGameState(roomId: string): GameState | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM game_states WHERE room_id = ?').get(roomId) as any;
  if (!row) return null;
  const state: GameState = {
    roomId: row.room_id,
    currentTurn: row.current_turn,
    activePlayer: row.active_player,
    storyLog: JSON.parse(row.story_log),
    generationParams: JSON.parse(row.generation_params),
    systemPrompt: row.system_prompt,
    status: row.status,
  };
  if (row.direction_votes) state.directionVotes = JSON.parse(row.direction_votes);
  if (row.voted_players) state.votedPlayers = JSON.parse(row.voted_players);
  if (row.pending_directions) state.pendingDirections = JSON.parse(row.pending_directions);
  return state;
}

function saveGameState(state: GameState) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO game_states (room_id, current_turn, active_player, story_log, generation_params, system_prompt, status, direction_votes, voted_players, pending_directions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    state.roomId,
    state.currentTurn,
    state.activePlayer,
    JSON.stringify(state.storyLog),
    JSON.stringify(state.generationParams),
    state.systemPrompt,
    state.status,
    state.directionVotes ? JSON.stringify(state.directionVotes) : null,
    state.votedPlayers ? JSON.stringify(state.votedPlayers) : null,
    state.pendingDirections ? JSON.stringify(state.pendingDirections) : null,
  );
}

function getScenario(roomId: string): Scenario | null {
  const db = getDb();
  const room = db.prepare('SELECT scenario_id FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room?.scenario_id) return null;
  const s = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(room.scenario_id) as any;
  if (!s) return null;
  return {
    ...s,
    characterTemplates: JSON.parse(s.character_templates),
    defaultTheme: s.default_theme,
    isPreset: !!s.is_preset,
  };
}

function getPlayers(roomId: string): PlayerInfo[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM players WHERE room_id = ?').all(roomId) as any[];
  return rows.map(p => ({
    id: p.id,
    slot: p.slot,
    displayName: p.display_name,
    character: p.character ? JSON.parse(p.character) : null,
    llmConfig: p.llm_config ? JSON.parse(p.llm_config) : null,
    connected: !!p.connected,
    ready: !!p.ready,
  }));
}

export async function startGame(roomId: string) {
  const scenario = getScenario(roomId);
  if (!scenario) return;

  const players = getPlayers(roomId);
  const systemPrompt = buildSystemPrompt(scenario, players);

  const state: GameState = {
    roomId,
    currentTurn: 0,
    activePlayer: 1,
    storyLog: [],
    generationParams: { ...DEFAULT_GEN_PARAMS },
    systemPrompt,
    status: 'playing',
  };

  saveGameState(state);

  broadcastAll(roomId, 'game_started', { gameState: state });

  await generateOpening(roomId, state, scenario, players);
}

async function generateOpening(
  roomId: string,
  state: GameState,
  scenario: Scenario,
  players: PlayerInfo[],
) {
  const activePlayer = players.find(p => p.slot === 1);
  const config = activePlayer?.llmConfig;
  if (!config?.apiKey) {
    broadcastAll(roomId, 'generation_error', { message: '玩家1未配置 LLM API Key' });
    return;
  }

  const messages = buildOpeningMessages(state.systemPrompt, scenario);
  await streamNarration(roomId, state, config, messages, 'narration');
}

export async function processAction(
  roomId: string,
  playerSlot: 1 | 2,
  actionText: string,
) {
  const state = getGameState(roomId);
  if (!state || state.status !== 'playing') return;
  if (state.activePlayer !== playerSlot) return;
  if (generatingRooms.has(roomId)) return;

  const players = getPlayers(roomId);

  const actionEntry: StoryEntry = {
    id: nanoid(8),
    type: 'action',
    content: actionText,
    playerSlot,
    turnNumber: state.currentTurn,
    timestamp: new Date().toISOString(),
  };

  state.storyLog.push(actionEntry);
  state.currentTurn++;
  state.activePlayer = playerSlot === 1 ? 2 : 1;
  saveGameState(state);

  broadcastAll(roomId, 'action_received', { entry: actionEntry });

  const activeConfig = players.find(p => p.slot === playerSlot)?.llmConfig;
  if (!activeConfig?.apiKey) {
    broadcastAll(roomId, 'generation_error', { message: `玩家${playerSlot}未配置 LLM API Key` });
    return;
  }

  const scenario = getScenario(roomId);
  if (!scenario) return;

  const sysPrompt = buildSystemPrompt(scenario, players, state.systemPrompt);
  const messages = buildMessages(
    sysPrompt,
    state.storyLog,
    state.activePlayer,
    players,
    state.generationParams.maxContextLength,
  );

  await streamNarration(roomId, state, activeConfig, messages, 'narration');

  // Check for review trigger
  if (state.currentTurn > 0 && state.currentTurn % REVIEW_INTERVAL === 0) {
    await triggerReview(roomId, state, activeConfig, players);
  }
}

async function streamNarration(
  roomId: string,
  state: GameState,
  config: LLMConfig,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  entryType: 'narration' | 'review' | 'finale',
) {
  if (generatingRooms.has(roomId)) return;
  generatingRooms.add(roomId);
  try {
    const adapter = getAdapter(config);
    let fullContent = '';

    try {
      if (state.generationParams.stream) {
        const gen = adapter.generateStream(messages, config, state.generationParams);
        let result;

        while (true) {
          result = await gen.next();
          if (result.done) break;
          const chunk = result.value as string;
          fullContent += chunk;
          broadcastAll(roomId, 'narration_stream', { chunk });
        }
      } else {
        const response = await adapter.generate(messages, config, state.generationParams);
        fullContent = response.content;
      }

      const { narration, suggestions } = parseSuggestions(fullContent);

      const entry: StoryEntry = {
        id: nanoid(8),
        type: entryType,
        content: narration,
        suggestions,
        turnNumber: state.currentTurn,
        timestamp: new Date().toISOString(),
      };

      state.storyLog.push(entry);
      saveGameState(state);

      broadcastAll(roomId, 'narration_complete', { entry });
    } catch (err: any) {
      // Retry once on failure
      try {
        const retryResponse = await adapter.generate(messages, config, state.generationParams);
        fullContent = retryResponse.content;
        const { narration, suggestions } = parseSuggestions(fullContent);
        const entry: StoryEntry = {
          id: nanoid(8),
          type: entryType,
          content: narration,
          suggestions,
          turnNumber: state.currentTurn,
          timestamp: new Date().toISOString(),
        };
        state.storyLog.push(entry);
        saveGameState(state);
        broadcastAll(roomId, 'narration_complete', { entry });
        return;
      } catch {
        // retry also failed
      }
      broadcastAll(roomId, 'generation_error', {
        message: err.message || 'LLM generation failed',
      });
    }
  } finally {
    generatingRooms.delete(roomId);
  }
}

async function triggerReview(
  roomId: string,
  state: GameState,
  config: LLMConfig,
  players: PlayerInfo[],
) {
  const reviewMessages = buildReviewMessages(state.systemPrompt, state.storyLog, state.currentTurn);
  const adapter = getAdapter(config);

  try {
    const response = await adapter.generate(reviewMessages, config, state.generationParams);
    const { review, directions } = parseDirections(response.content);

    const reviewEntry: StoryEntry = {
      id: nanoid(8),
      type: 'review',
      content: review,
      suggestions: directions.length > 0 ? directions : undefined,
      turnNumber: state.currentTurn,
      timestamp: new Date().toISOString(),
    };

    state.storyLog.push(reviewEntry);

    if (directions.length > 0) {
      state.pendingDirections = directions;
      state.directionVotes = {};
      state.votedPlayers = [];
    }

    saveGameState(state);

    broadcastAll(roomId, 'review_triggered', { entry: reviewEntry, turn: state.currentTurn });

    if (directions.length > 0) {
      broadcastAll(roomId, 'directions_pending', { directions });
    }
  } catch {
    // review is non-critical, silently skip
  }
}

export async function triggerFinale(roomId: string) {
  const state = getGameState(roomId);
  if (!state || state.status !== 'playing') return;

  state.status = 'finale';
  saveGameState(state);

  const players = getPlayers(roomId);
  const config = players.find(p => p.llmConfig?.apiKey)?.llmConfig;
  if (!config) return;

  const scenario = getScenario(roomId);
  if (!scenario) return;

  const messages = buildMessages(
    state.systemPrompt,
    state.storyLog,
    state.activePlayer,
    players,
    state.generationParams.maxContextLength,
  );

  messages.push({
    role: 'user',
    content: '故事即将进入尾声。请生成一段精彩的结局叙事（200-400字），为整个冒险画上句号。给出一个开放式但有满足感的结局。不需要提供建议行动。',
  });

  broadcastAll(roomId, 'finale_started', {});
  await streamNarration(roomId, state, config, messages, 'finale');

  state.status = 'finished';
  saveGameState(state);

  const db = getDb();
  db.prepare("UPDATE rooms SET status = 'finished' WHERE id = ?").run(roomId);

  broadcastAll(roomId, 'finale_complete', { gameState: state });
}

export function updateGenParams(roomId: string, params: Partial<GenerationParams>) {
  const state = getGameState(roomId);
  if (!state) return;
  state.generationParams = { ...state.generationParams, ...params };
  saveGameState(state);
  broadcastAll(roomId, 'gen_params_updated', { params: state.generationParams });
}

export function updateSystemPrompt(roomId: string, prompt: string) {
  const state = getGameState(roomId);
  if (!state) return;
  state.systemPrompt = prompt;
  saveGameState(state);
}

export function handleVoteDirection(roomId: string, playerSlot: 1 | 2, direction: string): void {
  const state = getGameState(roomId);
  if (!state) return;
  if (!state.pendingDirections || state.pendingDirections.length === 0) return;
  if (state.votedPlayers?.includes(playerSlot)) return;

  if (!state.directionVotes) state.directionVotes = {};
  if (!state.votedPlayers) state.votedPlayers = [];

  state.directionVotes[direction] = (state.directionVotes[direction] || 0) + 1;
  state.votedPlayers.push(playerSlot);
  saveGameState(state);

  if (state.votedPlayers.length >= 2) {
    // Both players have voted - resolve the direction
    let chosenDirection = direction;
    const votes = state.directionVotes;
    const entries = Object.entries(votes);
    entries.sort((a, b) => b[1] - a[1]);

    if (entries.length === 1) {
      // Both voted for the same direction
      chosenDirection = entries[0][0];
    } else if (entries[0][1] === entries[1][1]) {
      // Tie - randomly pick one
      const tiedDirections = entries.filter(e => e[1] === entries[0][1]).map(e => e[0]);
      chosenDirection = tiedDirections[Math.floor(Math.random() * tiedDirections.length)];
    } else {
      chosenDirection = entries[0][0];
    }

    // Add system entry for the chosen direction
    const systemEntry: StoryEntry = {
      id: nanoid(8),
      type: 'system',
      content: `故事方向: ${chosenDirection}`,
      turnNumber: state.currentTurn,
      timestamp: new Date().toISOString(),
    };
    state.storyLog.push(systemEntry);

    // Clear voting state
    state.pendingDirections = undefined;
    state.directionVotes = undefined;
    state.votedPlayers = undefined;
    saveGameState(state);

    broadcastAll(roomId, 'direction_resolved', { direction: chosenDirection });
  }
}
