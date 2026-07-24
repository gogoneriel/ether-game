import http from 'node:http';
import { requireAgentSecret } from './auth.mjs';
import { loadDesignDocs } from './designDocs.mjs';
import { loadKnowledgePack } from './knowledge.mjs';
import {
  chatCompletion,
  extractAssistantText,
  extractToolCalls,
} from './openrouter.mjs';
import { resolvePersona } from './personas.mjs';
import { syncRepo } from './repoSync.mjs';
import {
  TOOL_DEFINITIONS,
  buildBalanceReport,
  runTool,
} from './tools.mjs';

const PORT = Number(process.env.PORT || 8080);
const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY = 12;

/** GLM sometimes writes tool calls as text instead of structured tool_calls. */
const TOOL_LEAK_RE = /<\|?\/?\s*tool[_-]?call|<toolcall|<\|assistant\|>|<\|observation\|>/i;

/** Strip leaked pseudo-tool-call markup; returns cleaned text (may be ''). */
function stripToolLeak(text) {
  return String(text || '')
    .replace(
      /<\|?\/?\s*tool[_-]?call\b[^>]*>[\s\S]*?(?:<\/\|?\s*tool[_-]?call\s*>|$)/gi,
      ' ',
    )
    .replace(/<\/?\|?\s*tool[_-]?call\b[^>]*>?/gi, ' ')
    .replace(/<\/?toolcall\b[^>]*>?/gi, ' ')
    .replace(/<toolcall[^>]*>?/gi, ' ')
    .replace(/<\|[a-z_]+\|>/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function runChat({ message, history, mode }) {
  const persona = resolvePersona(mode);
  const pack = loadKnowledgePack();
  const design = loadDesignDocs();

  /** @type {Array<{ role: string, content?: string, tool_calls?: object[], tool_call_id?: string, name?: string }>} */
  const messages = [
    { role: 'system', content: persona.system },
    {
      role: 'system',
      content: `Knowledge pack (${pack.missing ? 'FALLBACK' : 'loaded'}${pack.truncated ? ', truncated' : ''}):\n\n${pack.text}`,
    },
    {
      role: 'system',
      content: `Live design docs (synced from repo${design.truncated ? ', truncated' : ''}; files: ${(design.files || []).join(', ') || 'none'}):\n\n${design.text}`,
    },
  ];

  const hist = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  for (const h of hist) {
    if (
      h &&
      (h.role === 'user' || h.role === 'assistant') &&
      typeof h.content === 'string'
    ) {
      messages.push({ role: h.role, content: h.content.slice(0, 8000) });
    }
  }
  messages.push({ role: 'user', content: message.slice(0, 8000) });

  const toolTrace = [];
  let lastJson = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    lastJson = await chatCompletion({
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: mode === 'analyzer' ? 0.2 : 0.35,
    });

    const toolCalls = extractToolCalls(lastJson);
    if (!toolCalls.length) {
      const text = extractAssistantText(lastJson);
      if (TOOL_LEAK_RE.test(text) && round < MAX_TOOL_ROUNDS - 1) {
        // Model wrote a tool call as text — push it back and demand a real call.
        messages.push({ role: 'assistant', content: text.slice(0, 2000) });
        messages.push({
          role: 'system',
          content:
            'You wrote a tool call as plain text. That does nothing. Either call the tool through the function-calling interface (tool_calls), or answer the owner in plain words without any tool markup.',
        });
        continue;
      }
      break;
    }

    const assistantMsg = lastJson.choices?.[0]?.message;
    messages.push({
      role: 'assistant',
      content: assistantMsg?.content || '',
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const name = call?.function?.name || 'unknown';
      let args = {};
      try {
        args = JSON.parse(call?.function?.arguments || '{}');
      } catch {
        args = {};
      }
      const result = await runTool(name, args);
      toolTrace.push({ name, args, ok: result?.ok !== false });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name,
        content: JSON.stringify(result).slice(0, 20_000),
      });
    }
  }

  // Final answer without forcing more tools if the last turn still had tools
  if (extractToolCalls(lastJson).length) {
    lastJson = await chatCompletion({
      messages,
      temperature: mode === 'analyzer' ? 0.2 : 0.35,
    });
  }

  let reply = extractAssistantText(lastJson) || 'No reply from model.';
  if (TOOL_LEAK_RE.test(reply)) {
    reply =
      stripToolLeak(reply) ||
      'I tried to run a lookup and tripped over my own boots — ask me that again in one sentence.';
  }
  return {
    reply,
    mode: persona.id,
    toolTrace,
    model: process.env.OPENROUTER_MODEL || 'z-ai/glm-5.2',
    knowledgeMissing: pack.missing,
    designDocs: design.files || [],
    designDocsMissing: design.missing,
  };
}

function offlineReply(mode, message) {
  return [
    `Hermes (${mode}) is online but OPENROUTER_API_KEY is not set on this host.`,
    'I still have the knowledge pack and can serve /agent/report/balance once telemetry exists.',
    `You asked: “${message.slice(0, 160)}”.`,
    'Set OPENROUTER_API_KEY (model z-ai/glm-5.2) and retry.',
  ].join(' ');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && (path === '/healthz' || path === '/agent/healthz')) {
    sendJson(res, 200, {
      ok: true,
      service: 'hermes-game-agent',
      model: process.env.OPENROUTER_MODEL || 'z-ai/glm-5.2',
      openrouter: Boolean((process.env.OPENROUTER_API_KEY || '').trim()),
      supabase: Boolean(
        (process.env.SUPABASE_URL || '').trim() &&
          (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
      ),
    });
    return;
  }

  // All other /agent/* routes require secret
  if (!path.startsWith('/agent')) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  if (path !== '/agent/healthz' && !requireAgentSecret(req, res)) return;

  try {
    if (req.method === 'GET' && path === '/agent/report/balance') {
      const days = Number(url.searchParams.get('days') || 7);
      const report = await buildBalanceReport(days);
      sendJson(res, 200, report);
      return;
    }

    if (req.method === 'POST' && path === '/agent/repo/sync') {
      const result = syncRepo();
      sendJson(res, result.ok ? 200 : 500, result);
      return;
    }

    if (req.method === 'POST' && path === '/agent/chat') {
      const body = await readJson(req);
      if (body == null) {
        sendJson(res, 400, { error: 'invalid_json' });
        return;
      }
      const message = String(body.message || '').trim();
      if (!message || message.length > 4000) {
        sendJson(res, 400, { error: 'invalid_message' });
        return;
      }
      const mode = body.mode === 'analyzer' ? 'analyzer' : 'architect';

      if (!(process.env.OPENROUTER_API_KEY || '').trim()) {
        sendJson(res, 200, {
          reply: offlineReply(mode, message),
          mode,
          offline: true,
          toolTrace: [],
        });
        return;
      }

      try {
        const result = await runChat({
          message,
          history: body.history,
          mode,
        });
        sendJson(res, 200, { ...result, offline: false });
      } catch (err) {
        console.error('[hermes] chat error', err?.message || err);
        sendJson(res, 200, {
          reply: offlineReply(mode, message),
          mode,
          offline: true,
          error: err?.message || 'chat_failed',
          toolTrace: [],
        });
      }
      return;
    }

    sendJson(res, 404, { error: 'not_found', path });
  } catch (err) {
    console.error('[hermes] request error', err);
    sendJson(res, 500, { error: 'internal_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[hermes-game-agent] listening on :${PORT}`);
  // Initial repo sync (non-blocking)
  setTimeout(() => {
    try {
      const result = syncRepo();
      console.log('[hermes-game-agent] repo sync', result.action, result.ok, result.detail);
    } catch (err) {
      console.warn('[hermes-game-agent] repo sync failed', err?.message || err);
    }
  }, 500);

  const refreshMs = Number(process.env.REPO_REFRESH_MS || 3_600_000);
  if (refreshMs > 0) {
    setInterval(() => {
      try {
        const result = syncRepo();
        console.log('[hermes-game-agent] repo refresh', result.ok, result.detail);
      } catch (err) {
        console.warn('[hermes-game-agent] repo refresh failed', err?.message || err);
      }
    }, refreshMs).unref?.();
  }
});
