import type {
  Character,
  GameState,
  GenerationParams,
  LLMConfig,
  NarratorStyleId,
  PlayerInfo,
  ReactionEmoji,
  Room,
  Scenario,
  StoryEntry,
} from './types.js';

export interface WSMessage<T extends string = string, P = unknown> {
  type: T;
  payload: P;
  seq: number;
  timestamp: string;
}

// --- Client → Server ---

export type ClientMessage =
  | WSMessage<'join_room', { roomId: string; displayName: string; playerId?: string }>
  | WSMessage<'leave_room', {}>
  | WSMessage<'select_scenario', { scenarioId: string }>
  | WSMessage<'update_character', { character: Character }>
  | WSMessage<'update_llm_config', { config: LLMConfig }>
  | WSMessage<'update_gen_params', { params: Partial<GenerationParams> }>
  | WSMessage<'update_system_prompt', { prompt: string }>
  | WSMessage<'ready', {}>
  | WSMessage<'submit_action', { action: string }>
  | WSMessage<'vote_finale', {}>
  | WSMessage<'vote_direction', { direction: string }>
  | WSMessage<'send_reaction', { entryId: string; emoji: ReactionEmoji }>
  | WSMessage<'update_narrator_style', { style: NarratorStyleId }>
  | WSMessage<'ping', {}>;

// --- Server → Client ---

export type ServerMessage =
  | WSMessage<'room_state', { room: Room; gameState: GameState | null; scenario: Scenario | null; playerId: string; slot: 1 | 2 }>
  | WSMessage<'player_joined', { player: PlayerInfo }>
  | WSMessage<'player_left', { slot: 1 | 2 }>
  | WSMessage<'player_reconnected', { slot: 1 | 2 }>
  | WSMessage<'scenario_selected', { scenario: Scenario }>
  | WSMessage<'character_updated', { slot: 1 | 2; character: Character }>
  | WSMessage<'gen_params_updated', { params: GenerationParams }>
  | WSMessage<'player_ready', { slot: 1 | 2; ready: boolean }>
  | WSMessage<'game_started', { gameState: GameState }>
  | WSMessage<'action_received', { entry: StoryEntry }>
  | WSMessage<'narration_stream', { chunk: string }>
  | WSMessage<'narration_complete', { entry: StoryEntry }>
  | WSMessage<'review_triggered', { entry: StoryEntry; turn: number }>
  | WSMessage<'finale_started', {}>
  | WSMessage<'finale_complete', { gameState: GameState }>
  | WSMessage<'directions_pending', { directions: string[] }>
  | WSMessage<'direction_resolved', { direction: string }>
  | WSMessage<'generation_error', { message: string }>
  | WSMessage<'reaction_received', { entryId: string; emoji: ReactionEmoji; playerSlot: 1 | 2 }>
  | WSMessage<'narrator_style_updated', { style: NarratorStyleId }>
  | WSMessage<'error', { code: string; message: string }>
  | WSMessage<'pong', {}>;
