import type { GameState, Scenario, PlayerInfo, StoryEntry } from '../../shared/types.js';
import type { LLMMessage } from '../llm/adapter.js';
import { DEFAULT_SYSTEM_PROMPT } from '../../shared/constants.js';

export function buildSystemPrompt(
  scenario: Scenario,
  players: PlayerInfo[],
  customSystemPrompt?: string,
): string {
  const base = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;

  const p1 = players.find(p => p.slot === 1);
  const p2 = players.find(p => p.slot === 2);

  return `${base}

## 场景设定
**${scenario.name}** — ${scenario.genre}

### 世界观
${scenario.worldLore}

### 基调
${scenario.tone}

## 角色
### 玩家 1: ${p1?.character?.name ?? p1?.displayName ?? '玩家1'}
${p1?.character ? formatCharacter(p1.character) : '（未设置角色）'}

### 玩家 2: ${p2?.character?.name ?? p2?.displayName ?? '玩家2'}
${p2?.character ? formatCharacter(p2.character) : '（未设置角色）'}`;
}

function formatCharacter(c: { name: string; description: string; traits: string[]; backstory: string; appearance: string }): string {
  return `- 简介: ${c.description}
- 性格: ${c.traits.join('、')}
- 背景: ${c.backstory}
- 外貌: ${c.appearance}`;
}

export function buildMessages(
  systemPrompt: string,
  storyLog: StoryEntry[],
  activePlayerSlot: 1 | 2,
  players: PlayerInfo[],
  maxContextLength: number,
): LLMMessage[] {
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  const activePlayer = players.find(p => p.slot === activePlayerSlot);
  const activeName = activePlayer?.character?.name ?? activePlayer?.displayName ?? `玩家${activePlayerSlot}`;

  for (const entry of storyLog) {
    if (entry.type === 'narration' || entry.type === 'review' || entry.type === 'finale') {
      messages.push({ role: 'assistant', content: entry.content });
    } else if (entry.type === 'action') {
      const player = players.find(p => p.slot === entry.playerSlot);
      const name = player?.character?.name ?? player?.displayName ?? `玩家${entry.playerSlot}`;
      messages.push({ role: 'user', content: `[${name}的行动] ${entry.content}` });
    } else if (entry.type === 'system') {
      messages.push({ role: 'user', content: `[系统] ${entry.content}` });
    }
  }

  messages.push({
    role: 'user',
    content: `请继续叙事。当前是${activeName}行动后的情节发展。记住在叙事结束后用 ---SUGGESTIONS--- 格式提供2-3个建议行动给下一位玩家。`,
  });

  return trimToContextWindow(messages, maxContextLength);
}

export function buildOpeningMessages(
  systemPrompt: string,
  scenario: Scenario,
): LLMMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请根据以下开场提示生成游戏的开场叙事。这是故事的开始，请设置场景和氛围，然后在结尾用 ---SUGGESTIONS--- 格式为玩家1提供2-3个初始行动建议。

开场提示:
${scenario.openingPrompt}`,
    },
  ];
}

export function buildReviewMessages(
  systemPrompt: string,
  storyLog: StoryEntry[],
  currentTurn: number,
): LLMMessage[] {
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  const summary = storyLog
    .filter(e => e.type !== 'system')
    .map(e => {
      if (e.type === 'action') return `[行动] ${e.content}`;
      return e.content;
    })
    .join('\n\n---\n\n');

  messages.push({
    role: 'user',
    content: `以下是到目前为止的完整故事（第${currentTurn}回合）。请回顾故事的整体进展，给出一段简短的回顾性叙事（50-100字），总结故事的关键进展和当前局势。

然后，请在回顾内容之后提出2-3个可能的故事发展方向供玩家投票选择。请使用以下格式：

---DIRECTIONS---
1. [方向标题] — [简短描述]
2. [方向标题] — [简短描述]
3. [方向标题] — [简短描述]

${summary}`,
  });

  return messages;
}

function trimToContextWindow(messages: LLMMessage[], maxLength: number): LLMMessage[] {
  let totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const estimatedTokens = totalChars * 0.5;

  if (estimatedTokens <= maxLength) return messages;

  const result = [messages[0]];
  const tail = messages.slice(1);

  while (tail.length > 1) {
    const remaining = tail.reduce((sum, m) => sum + m.content.length, 0) * 0.5;
    if (remaining + result[0].content.length * 0.5 <= maxLength) break;
    tail.shift();
  }

  return [...result, ...tail];
}
