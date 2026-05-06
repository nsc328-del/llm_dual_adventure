import type { LLMConfig, GenerationParams } from '../../shared/types.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  finishReason: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LLMAdapter {
  generate(
    messages: LLMMessage[],
    config: LLMConfig,
    params: GenerationParams,
  ): Promise<LLMResponse>;

  generateStream(
    messages: LLMMessage[],
    config: LLMConfig,
    params: GenerationParams,
  ): AsyncGenerator<string, LLMResponse>;
}
