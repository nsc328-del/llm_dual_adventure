import { create } from 'zustand';
import type { Room, GameState, Scenario, PlayerInfo, Character, LLMConfig, GenerationParams, StoryEntry, ThemeId } from '@shared/types.js';

export type AppPhase = 'lobby' | 'setup' | 'playing';

interface GameStore {
  // Connection
  phase: AppPhase;
  connected: boolean;
  playerId: string | null;
  mySlot: (1 | 2) | null;

  // Room
  room: Room | null;
  scenario: Scenario | null;

  // Game
  gameState: GameState | null;
  isGenerating: boolean;
  streamBuffer: string;

  // Direction voting
  pendingDirections: string[] | null;
  votedDirection: string | null;
  resolvedDirection: string | null;

  // Archive
  archiveRoomId: string | null;
  setArchiveRoom: (roomId: string) => void;
  clearArchive: () => void;

  // Errors
  error: string | null;
  clearError: () => void;

  // Local 2P mode
  isLocalMode: boolean;
  setLocalMode: (v: boolean) => void;

  // Local config
  displayName: string;
  llmConfig: LLMConfig;

  // Actions
  setPhase: (phase: AppPhase) => void;
  setConnected: (connected: boolean) => void;
  setDisplayName: (name: string) => void;
  setLLMConfig: (config: LLMConfig) => void;

  handleRoomState: (data: { room: Room; gameState: GameState | null; scenario: Scenario | null; playerId: string; slot: 1 | 2 }) => void;
  handlePlayerJoined: (player: PlayerInfo) => void;
  handlePlayerLeft: (slot: 1 | 2) => void;
  handlePlayerReconnected: (slot: 1 | 2) => void;
  handleScenarioSelected: (scenario: Scenario) => void;
  handleCharacterUpdated: (slot: 1 | 2, character: Character) => void;
  handlePlayerReady: (slot: 1 | 2, ready: boolean) => void;
  handleGameStarted: (gameState: GameState) => void;
  handleActionReceived: (entry: StoryEntry) => void;
  handleNarrationStream: (chunk: string) => void;
  handleNarrationComplete: (entry: StoryEntry) => void;
  handleReviewTriggered: (entry: StoryEntry, turn: number) => void;
  handleGenParamsUpdated: (params: GenerationParams) => void;
  handleDirectionsPending: (directions: string[]) => void;
  handleDirectionResolved: (direction: string) => void;
  handleFinaleStarted: () => void;
  handleFinaleComplete: (gameState: GameState) => void;
  handleGenerationError: (message: string) => void;

  reset: () => void;
}

function loadLLMConfig(): LLMConfig {
  try {
    const saved = localStorage.getItem('llm_config');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'mimo-v2.5-pro',
  };
}

const INITIAL_LLM_CONFIG: LLMConfig = loadLLMConfig();

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'lobby',
  connected: false,
  playerId: null,
  mySlot: null,
  room: null,
  scenario: null,
  gameState: null,
  isGenerating: false,
  streamBuffer: '',
  error: null,
  pendingDirections: null,
  votedDirection: null,
  resolvedDirection: null,
  archiveRoomId: null,
  isLocalMode: false,
  displayName: '',
  llmConfig: INITIAL_LLM_CONFIG,

  setPhase: (phase) => set({ phase }),
  setConnected: (connected) => set({ connected }),
  setDisplayName: (name) => set({ displayName: name }),
  setLLMConfig: (config) => {
    set({ llmConfig: config });
    try { localStorage.setItem('llm_config', JSON.stringify(config)); } catch {}
  },
  clearError: () => set({ error: null }),
  setArchiveRoom: (roomId) => set({ archiveRoomId: roomId }),
  clearArchive: () => set({ archiveRoomId: null }),
  setLocalMode: (v) => set({ isLocalMode: v }),

  handleRoomState: (data) => {
    const phase = data.gameState ? 'playing' : (data.room.status === 'playing' ? 'playing' : 'setup');
    set({
      room: data.room,
      gameState: data.gameState,
      scenario: data.scenario,
      playerId: data.playerId,
      mySlot: data.slot,
      phase,
      pendingDirections: data.gameState?.pendingDirections ?? null,
      votedDirection: null,
      resolvedDirection: null,
    });
    sessionStorage.setItem('playerId', data.playerId);
    sessionStorage.setItem('roomId', data.room.id);
  },

  handlePlayerJoined: (player) => {
    const { room } = get();
    if (!room) return;
    const exists = room.players.some(p => p.id === player.id);
    const players = exists
      ? room.players.map(p => p.id === player.id ? player : p)
      : [...room.players, player];
    set({
      room: { ...room, players, status: players.length >= 2 ? 'setup' : 'waiting' },
    });
  },

  handlePlayerLeft: (slot) => {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.map(p => p.slot === slot ? { ...p, connected: false } : p),
      },
    });
  },

  handlePlayerReconnected: (slot) => {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.map(p => p.slot === slot ? { ...p, connected: true } : p),
      },
    });
  },

  handleScenarioSelected: (scenario) => {
    const { room } = get();
    if (!room) return;
    set({ scenario, room: { ...room, scenarioId: scenario.id } });
  },

  handleCharacterUpdated: (slot, character) => {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.map(p => p.slot === slot ? { ...p, character } : p),
      },
    });
  },

  handlePlayerReady: (slot, ready) => {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.map(p => p.slot === slot ? { ...p, ready } : p),
      },
    });
  },

  handleGameStarted: (gameState) => {
    set({ gameState, phase: 'playing', isGenerating: true, streamBuffer: '' });
  },

  handleActionReceived: (entry) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        storyLog: [...gameState.storyLog, entry],
        activePlayer: entry.playerSlot === 1 ? 2 : 1,
        currentTurn: gameState.currentTurn + 1,
      },
      isGenerating: true,
      streamBuffer: '',
    });
  },

  handleNarrationStream: (chunk) => {
    set(s => ({ streamBuffer: s.streamBuffer + chunk }));
  },

  handleNarrationComplete: (entry) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        storyLog: [...gameState.storyLog, entry],
      },
      isGenerating: false,
      streamBuffer: '',
    });
  },

  handleReviewTriggered: (entry, turn) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        storyLog: [...gameState.storyLog, entry],
      },
    });
  },

  handleGenParamsUpdated: (params) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: { ...gameState, generationParams: params },
    });
  },

  handleDirectionsPending: (directions) => {
    set({ pendingDirections: directions, votedDirection: null, resolvedDirection: null });
  },

  handleDirectionResolved: (direction) => {
    set({ pendingDirections: null, votedDirection: null, resolvedDirection: direction });
    // Clear resolved direction after a delay so the UI can show it briefly
    setTimeout(() => {
      useGameStore.setState({ resolvedDirection: null });
    }, 5000);
  },

  handleFinaleStarted: () => {
    set({ isGenerating: true, streamBuffer: '' });
  },

  handleFinaleComplete: (gameState) => {
    set({ gameState, isGenerating: false, streamBuffer: '' });
  },

  handleGenerationError: (message) => {
    set({ isGenerating: false, streamBuffer: '', error: message });
    console.error('[Generation Error]', message);
  },

  reset: () => {
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('roomId');
    set({
      phase: 'lobby',
      playerId: null,
      mySlot: null,
      room: null,
      scenario: null,
      gameState: null,
      isGenerating: false,
      streamBuffer: '',
      pendingDirections: null,
      votedDirection: null,
      resolvedDirection: null,
    });
  },
}));
