// Shared AI client for Edge Functions: Anthropic Claude 3.5 Sonnet primary, OpenAI gpt-4o-mini fallback.

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const PRIMARY_MODEL = 'claude-3-5-sonnet-20241022';
const FALLBACK_MODEL = 'gpt-4o-mini';

const PRIMARY_TIMEOUT_MS = 55_000;

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type GenerateCompletionParams = {
  model?: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  responseFormat?: { type: 'json_object' };
};

function splitSystem(messages: ChatMessage[]): { system: string | undefined; rest: ChatMessage[] } {
  const systemParts: string[] = [];
  const rest: ChatMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') systemParts.push(m.content);
    else rest.push(m);
  }
  const system = systemParts.length ? systemParts.join('\n\n') : undefined;
  return { system, rest };
}

async function anthropicCompletion(params: GenerateCompletionParams): Promise<string> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY missing');

  const model = params.model ?? PRIMARY_MODEL;
  const { system, rest } = splitSystem(params.messages);
  const jsonHint =
    params.responseFormat?.type === 'json_object'
      ? '\n\nRespond with a single valid JSON object only. No markdown code fences or commentary.'
      : '';
  let anthropicMessages = rest.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  if (jsonHint && anthropicMessages.length > 0) {
    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last.role === 'user') {
      anthropicMessages = [
        ...anthropicMessages.slice(0, -1),
        { ...last, content: last.content + jsonHint },
      ];
    }
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), PRIMARY_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages: anthropicMessages,
    };
    if (system) body.system = system;

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Anthropic ${res.status}: ${t}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find(c => c.type === 'text')?.text;
    if (!text) throw new Error('Anthropic: empty content');
    return text;
  } finally {
    clearTimeout(tid);
  }
}

async function openaiCompletion(params: GenerateCompletionParams): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY missing');

  const model = params.model ?? FALLBACK_MODEL;
  const openaiMessages = params.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const body: Record<string, unknown> = {
    model,
    messages: openaiMessages,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
  };
  if (params.responseFormat) body.response_format = params.responseFormat;

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI: empty content');
  return text;
}

export async function generateCompletion(params: GenerateCompletionParams): Promise<string> {
  try {
    return await anthropicCompletion({ ...params, model: params.model ?? PRIMARY_MODEL });
  } catch (e) {
    console.warn('generateCompletion: primary failed, falling back to OpenAI:', e);
    return await openaiCompletion({ ...params, model: FALLBACK_MODEL });
  }
}

export async function analyzeImagesWithVision(imageUrls: string[], prompt: string): Promise<string> {
  if (!imageUrls.length) return '';

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    try {
      const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];
      for (const url of imageUrls) {
        content.push({
          type: 'image',
          source: { type: 'url', url },
        });
      }

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), PRIMARY_TIMEOUT_MS);
      try {
        const res = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: PRIMARY_MODEL,
            max_tokens: 400,
            temperature: 0,
            messages: [{ role: 'user', content }],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            content?: Array<{ type: string; text?: string }>;
          };
          const text = data.content?.find(c => c.type === 'text')?.text?.trim();
          if (text) return text;
        } else {
          console.warn('Anthropic vision:', res.status, await res.text());
        }
      } finally {
        clearTimeout(tid);
      }
    } catch (e) {
      console.warn('Anthropic vision failed:', e);
    }
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) return '';

  const imageContent = imageUrls.map(url => ({
    type: 'image_url' as const,
    image_url: { url, detail: 'low' as const },
  }));

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }, ...imageContent],
        },
      ],
      max_tokens: 400,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    console.error('OpenAI vision:', res.status, await res.text());
    return '';
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}
