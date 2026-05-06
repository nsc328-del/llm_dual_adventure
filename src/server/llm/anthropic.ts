import type { LLMConfig, GenerationParams } from '../../shared/types.js';
import type { LLMAdapter, LLMMessage, LLMResponse } from './adapter.js';

export class AnthropicAdapter implements LLMAdapter {
  async generate(
    messages: LLMMessage[],
    config: LLMConfig,
    params: GenerationParams,
  ): Promise<LLMResponse> {
    const { system, userMessages } = this.splitSystem(messages);
    const body = this.buildBody(userMessages, system, params, false, config.model);

    const res = await fetch(`${config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${text}`);
    }

    const data = await res.json() as any;
    const content = data.content.map((b: any) => b.text).join('');
    return {
      content,
      finishReason: data.stop_reason ?? 'end_turn',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
      } : undefined,
    };
  }

  async *generateStream(
    messages: LLMMessage[],
    config: LLMConfig,
    params: GenerationParams,
  ): AsyncGenerator<string, LLMResponse> {
    const { system, userMessages } = this.splitSystem(messages);
    const body = this.buildBody(userMessages, system, params, true, config.model);

    const res = await fetch(`${config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${text}`);
    }

    let fullContent = '';
    let finishReason = 'end_turn';

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
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(trimmed.slice(6));
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullContent += event.delta.text;
            yield event.delta.text;
          }
          if (event.type === 'message_delta' && event.delta?.stop_reason) {
            finishReason = event.delta.stop_reason;
          }
        } catch {
          // skip
        }
      }
    }

    return { content: fullContent, finishReason };
  }

  private splitSystem(messages: LLMMessage[]) {
    const systemMsgs = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    const system = systemMsgs.map(m => m.content).join('\n\n') || undefined;
    return { system, userMessages };
  }

  private buildBody(
    messages: LLMMessage[],
    system: string | undefined,
    params: GenerationParams,
    stream: boolean,
    model?: string,
  ) {
    const body: Record<string, unknown> = {
      model: model ?? 'claude-sonnet-4-6',
      messages,
      max_tokens: params.maxResponseTokens,
      stream,
      temperature: params.temperature,
      top_p: params.topP,
    };

    if (system) body.system = system;
    if (params.topK > 0) body.top_k = params.topK;
    if (params.stopSequences.length > 0) body.stop_sequences = params.stopSequences;

    return body;
  }
}
