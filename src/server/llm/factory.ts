import type { LLMConfig } from '../../shared/types.js';
import type { LLMAdapter } from './adapter.js';
import { OpenAIAdapter } from './openai.js';
import { AnthropicAdapter } from './anthropic.js';

const openaiAdapter = new OpenAIAdapter();
const anthropicAdapter = new AnthropicAdapter();

export function getAdapter(config: LLMConfig): LLMAdapter {
  switch (config.provider) {
    case 'anthropic':
      return anthropicAdapter;
    case 'openai':
    default:
      return openaiAdapter;
  }
}
