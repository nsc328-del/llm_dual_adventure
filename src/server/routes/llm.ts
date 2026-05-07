import type { FastifyInstance } from 'fastify';
import type { LLMProvider } from '../../shared/types.js';

export async function llmRoutes(app: FastifyInstance) {
  app.post<{
    Body: { provider: LLMProvider; baseUrl: string; apiKey: string; model: string };
  }>('/api/llm/test', async (req, reply) => {
    const { provider, baseUrl, apiKey, model } = req.body;

    if (!baseUrl || !apiKey || !model) {
      return reply.send({ ok: false, error: '缺少必要参数' });
    }

    try {
      if (provider === 'anthropic') {
        const res = await fetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          return reply.send({ ok: false, error: `API ${res.status}: ${text.slice(0, 200)}` });
        }

        const data = (await res.json()) as any;
        return reply.send({ ok: true, model: data.model ?? model });
      }

      // OpenAI-compatible
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return reply.send({ ok: false, error: `API ${res.status}: ${text.slice(0, 200)}` });
      }

      const data = (await res.json()) as any;
      return reply.send({ ok: true, model: data.model ?? model });
    } catch (err: any) {
      return reply.send({ ok: false, error: err.message ?? '连接失败' });
    }
  });
}
