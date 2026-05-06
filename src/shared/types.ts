export interface Character {
  name: string;
  description: string;
  traits: string[];
  backstory: string;
  appearance: string;
  avatarId: string;
}

export interface StoryEntry {
  id: string;
  type: 'narration' | 'action' | 'system' | 'review' | 'finale';
  content: string;
  suggestions?: string[];
  playerSlot?: 1 | 2;
  turnNumber: number;
  timestamp: string;
}

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface GenerationParams {
  temperature: number;
  topP: number;
  topK: number;
  minP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  repetitionPenalty: number;
  maxResponseTokens: number;
  maxContextLength: number;
  stopSequences: string[];
  stream: boolean;
}

export type GameStatus = 'setup' | 'playing' | 'finale' | 'finished';

export interface GameState {
  roomId: string;
  currentTurn: number;
  activePlayer: 1 | 2;
  storyLog: StoryEntry[];
  generationParams: GenerationParams;
  systemPrompt: string;
  status: GameStatus;
}

export type RoomStatus = 'waiting' | 'setup' | 'playing' | 'finished';

export interface PlayerInfo {
  id: string;
  slot: 1 | 2;
  displayName: string;
  character: Character | null;
  llmConfig: LLMConfig | null;
  connected: boolean;
  ready: boolean;
}

export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  scenarioId: string | null;
  players: PlayerInfo[];
  createdAt: string;
}

export type ThemeId = 'forest' | 'ocean' | 'mech' | 'cyber' | 'western';

export interface CharacterTemplate {
  name: string;
  description: string;
  suggestedTraits: string[];
  suggestedBackstory: string;
  suggestedAppearance: string;
  suggestedAvatarId: string;
  role: string;
}

export interface Scenario {
  id: string;
  name: string;
  genre: string;
  description: string;
  worldLore: string;
  tone: string;
  openingPrompt: string;
  characterTemplates: [CharacterTemplate, CharacterTemplate];
  defaultTheme: ThemeId;
  isPreset: boolean;
}
