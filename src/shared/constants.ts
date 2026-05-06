import type { GenerationParams, ThemeId } from './types.js';

export const DEFAULT_GEN_PARAMS: GenerationParams = {
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  minP: 0.05,
  frequencyPenalty: 0.3,
  presencePenalty: 0.3,
  repetitionPenalty: 1.1,
  maxResponseTokens: 1024,
  maxContextLength: 16384,
  stopSequences: [],
  stream: true,
};

export const PARAM_RANGES = {
  temperature: { min: 0, max: 2, step: 0.05 },
  topP: { min: 0, max: 1, step: 0.05 },
  topK: { min: 0, max: 200, step: 1 },
  minP: { min: 0, max: 1, step: 0.05 },
  frequencyPenalty: { min: 0, max: 2, step: 0.05 },
  presencePenalty: { min: 0, max: 2, step: 0.05 },
  repetitionPenalty: { min: 0.5, max: 2, step: 0.05 },
  maxResponseTokens: { min: 64, max: 8192, step: 64 },
  maxContextLength: { min: 1024, max: 131072, step: 1024 },
} as const;

export const PARAM_LABELS: Record<string, string> = {
  temperature: 'Temperature',
  topP: 'Top P',
  topK: 'Top K',
  minP: 'Min P',
  frequencyPenalty: 'Frequency Penalty',
  presencePenalty: 'Presence Penalty',
  repetitionPenalty: 'Repetition Penalty',
  maxResponseTokens: 'Max Response Tokens',
  maxContextLength: 'Max Context Length',
};

export const REVIEW_INTERVAL = 5;

export const THEMES: { id: ThemeId; name: string; label: string }[] = [
  { id: 'forest', name: 'Forest', label: '森林' },
  { id: 'ocean', name: 'Ocean', label: '海洋' },
  { id: 'mech', name: 'Mech', label: '机械' },
  { id: 'cyber', name: 'Cyber', label: '赛博' },
  { id: 'western', name: 'Western', label: '西幻' },
];

export const AVATAR_LIST = [
  { id: 'warrior', name: '战士' },
  { id: 'mage', name: '法师' },
  { id: 'rogue', name: '盗贼' },
  { id: 'archer', name: '弓箭手' },
  { id: 'cleric', name: '牧师' },
  { id: 'knight', name: '骑士' },
  { id: 'ninja', name: '忍者' },
  { id: 'pirate', name: '海盗' },
  { id: 'mechanic', name: '机械师' },
  { id: 'hacker', name: '黑客' },
  { id: 'scholar', name: '学者' },
  { id: 'alchemist', name: '炼金术士' },
] as const;

export const NARRATOR_AVATAR_ID = 'narrator';

export const DEFAULT_SYSTEM_PROMPT = `你是一个文字冒险游戏的叙事者和游戏主持人。

## 规则
- 你负责描述世界、NPC和玩家行动的后果
- 绝不替玩家角色说话或行动，只描述发生在他们周围和身上的事情
- 保持与之前所有事件的叙事连贯性
- 每段叙事结束时，制造一个自然引导下一位玩家行动的情境
- 回复保持在150-400字之间，除非情况需要更多描述
- 保持故事的戏剧性和沉浸感

## 输出格式
在叙事正文之后，用以下格式提供2-3个建议行动：

---SUGGESTIONS---
1. [建议行动1]
2. [建议行动2]
3. [建议行动3]`;
