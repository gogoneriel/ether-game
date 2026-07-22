const DEFAULT_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'z-ai/glm-5.2';

/**
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   tools?: Array<object>,
 *   tool_choice?: string | object,
 *   temperature?: number,
 *   max_tokens?: number,
 * }} opts
 */
export async function chatCompletion(opts) {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('OPENROUTER_API_KEY_missing');
    err.code = 'OPENROUTER_API_KEY_missing';
    throw err;
  }

  const base = (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE).replace(
    /\/$/,
    '',
  );
  const model = (process.env.OPENROUTER_MODEL || DEFAULT_MODEL).trim();

  const body = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.35,
    max_tokens: opts.max_tokens ?? 4096,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = opts.tool_choice ?? 'auto';
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wallet.liberether.com',
      'X-Title': 'Hermes Game Architect',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new Error(`openrouter_non_json:${res.status}`);
    err.status = res.status;
    err.body = text.slice(0, 500);
    throw err;
  }

  if (!res.ok) {
    const err = new Error(
      json?.error?.message || `openrouter_http_${res.status}`,
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

export function extractAssistantText(json) {
  const msg = json?.choices?.[0]?.message;
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content.trim();
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }
  return '';
}

export function extractToolCalls(json) {
  const msg = json?.choices?.[0]?.message;
  return Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];
}
