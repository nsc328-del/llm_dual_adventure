import type { LLMConfig, GenerationParams } from '../../shared/types.js';
import type { LLMAdapter, LLMMessage, LLMResponse } from './adapter.js';

export class OpenAIAdapter implements LLMAdapter {
  async generate(
    messages: LLMMessage[],
    config: LLMConfig,
    params: GenerationParams,
  ): Promise<LLMResponse> {
    const body = this.buildBody(messages, params, false, config.model);
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }

    const data = await res.json() as any;
    const choice = data.choices[0];
    return {
      content: choice.message.content ?? '',
      finishReason: choice.finish_reason ?? 'stop',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      } : undefined,
    };
  }

  async *generateStream(
    messages: LLMMessage[],
    config: LLMConfig,
    params: GenerationParams,
  ): AsyncGenerator<string, LLMResponse> {
    const body = this.buildBody(messages, params, true, config.model);
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }

    let fullContent = '';
    let finishReason = 'stop';

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            yield delta;
          }
          const fr = parsed.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
        } catch {
          // skip malformed chunks
        }
      }
    }

    return { content: fullContent, finishReason };
  }

  private buildBody(messages: LLMMessage[], params: GenerationParams, stream: boolean, model?: string) {
    const body: Record<string, unknown> = {
      model: model ?? 'gpt-4o',
      messages,
      stream,
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxResponseTokens,
    };

    if (params.frequencyPenalty) body.frequency_penalty = params.frequencyPenalty;
    if (params.presencePenalty) body.presence_penalty = params.presencePenalty;
    if (params.stopSequences.length > 0) body.stop = params.stopSequences;

    // Extended params for vLLM / compatible endpoints
    if (params.topK > 0) body.top_k = params.topK;
    if (params.minP > 0) body.min_p = params.minP;
    if (params.repetitionPenalty !== 1) body.repetition_penalty = params.repetitionPenalty;

    return body;
  }
}
