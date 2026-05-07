import type { GenerationParams, ThemeId, NarratorStyleId } from './types.js';

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

export const NARRATOR_STYLES: { id: NarratorStyleId; label: string; emoji: string; modifier: string }[] = [
  { id: 'default', label: '默认', emoji: '📖', modifier: '' },
  { id: 'serious', label: '严肃', emoji: '⚔️', modifier: '请用严肃、沉稳、克制的语气叙事。少用感叹号，多用冷静的描述和内敛的情感表达。营造厚重、写实的氛围。' },
  { id: 'humorous', label: '幽默', emoji: '😄', modifier: '请用轻松幽默的语气叙事。适当加入俏皮的比喻、角色的吐槽和荒诞的细节。即使在紧张场景中也保持一丝黑色幽默，让玩家会心一笑。' },
  { id: 'horror', label: '恐怖', emoji: '👻', modifier: '请用阴森、压迫感强的语气叙事。多描写不安的细节、诡异的感官体验和未知的威胁。善用留白和暗示，制造心理恐惧而非单纯的血腥。大量使用短句增强紧张感。' },
  { id: 'romantic', label: '浪漫', emoji: '🌹', modifier: '请用细腻、抒情的语气叙事。注重角色之间的情感互动和内心描写。多用优美的意象和诗意的比喻，营造温暖或感伤的氛围。' },
  { id: 'epic', label: '史诗', emoji: '👑', modifier: '请用宏大、壮阔的语气叙事。用史诗般的笔触描写场景和战斗，强调命运感和英雄气概。叙事节奏铿锵有力，渲染宏伟的世界观和深远的影响。' },
  { id: 'noir', label: '黑色', emoji: '🌃', modifier: '请用硬汉派黑色电影的风格叙事。大量使用第一/第三人称内心独白式描写，充满讽刺和愤世嫉俗。场景描写强调光影对比，角色动机暧昧不明。' },
];

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
在叙事正文之后，用以下格式提供2-3个建议行动。每个建议必须以 [角色名] 前缀开头，表示这是哪位角色视角的行动，并且建议内容必须从该角色的视角和处境出发：

---SUGGESTIONS---
1. [角色名] 建议行动1
2. [角色名] 建议行动2
3. [角色名] 建议行动3

在建议行动之后，请用以下格式简要更新两位角色的当前状态：

---STATUS---
[角色1名]: 位置:xxx | 物品:xxx,xxx | 状态:xxx
[角色2名]: 位置:xxx | 物品:xxx,xxx | 状态:xxx`;
