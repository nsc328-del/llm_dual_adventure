import { z } from 'zod';

const joinRoomPayload = z.object({
  roomId: z.string().min(1),
  displayName: z.string().min(1).max(20),
  playerId: z.string().optional(),
});

const selectScenarioPayload = z.object({
  scenarioId: z.string().min(1),
});

const updateCharacterPayload = z.object({
  character: z.object({
    name: z.string().min(1).max(30),
    description: z.string().max(500).default(''),
    traits: z.array(z.string().max(30)).max(10).default([]),
    backstory: z.string().max(1000).default(''),
    appearance: z.string().max(500).default(''),
    avatarId: z.string().default('warrior'),
  }),
});

const updateLLMConfigPayload = z.object({
  config: z.object({
    provider: z.enum(['openai', 'anthropic']),
    baseUrl: z.string().url(),
    apiKey: z.string().min(1),
    model: z.string().min(1),
  }),
});

const updateGenParamsPayload = z.object({
  params: z.object({
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(0).max(200).optional(),
    minP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(0).max(2).optional(),
    presencePenalty: z.number().min(0).max(2).optional(),
    repetitionPenalty: z.number().min(0.5).max(2).optional(),
    maxResponseTokens: z.number().min(1).max(8192).optional(),
    maxContextLength: z.number().min(1024).max(131072).optional(),
    stream: z.boolean().optional(),
  }).passthrough(),
});

const updateSystemPromptPayload = z.object({
  prompt: z.string().max(10000),
});

const submitActionPayload = z.object({
  action: z.string().min(1).max(2000),
});

const voteDirectionPayload = z.object({
  direction: z.string().min(1),
});

const sendReactionPayload = z.object({
  entryId: z.string().min(1),
  emoji: z.enum(['😱', '😂', '😰', '🔥', '👍']),
});

const updateNarratorStylePayload = z.object({
  style: z.enum(['default', 'serious', 'humorous', 'horror', 'romantic', 'epic', 'noir']),
});

const clientMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
  seq: z.number().optional(),
  timestamp: z.string().optional(),
});

export const payloadSchemas: Record<string, z.ZodType> = {
  join_room: joinRoomPayload,
  select_scenario: selectScenarioPayload,
  update_character: updateCharacterPayload,
  update_llm_config: updateLLMConfigPayload,
  update_gen_params: updateGenParamsPayload,
  update_system_prompt: updateSystemPromptPayload,
  submit_action: submitActionPayload,
  vote_direction: voteDirectionPayload,
  send_reaction: sendReactionPayload,
  update_narrator_style: updateNarratorStylePayload,
};

export { clientMessageSchema };
