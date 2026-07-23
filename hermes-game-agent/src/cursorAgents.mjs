/**
 * Cursor Cloud Agents API (v1) — Pain launches code changes onto the `pain` branch.
 * Docs: https://cursor.com/docs/cloud-agent/api/endpoints
 */

const API_BASE = 'https://api.cursor.com/v1';

const ALLOWED_REPOS = {
  liberview: 'https://github.com/gogoneriel/Liberview',
  'ether-game': 'https://github.com/gogoneriel/ether-game',
};

const PREVIEW_BRANCH = 'pain';
const PREVIEW_URL = 'https://pain.liberether.com';

/** @type {string | null} */
let lastAgentId = null;

export function cursorApiKey() {
  return (process.env.CURSOR_API_KEY || '').trim();
}

function authHeader() {
  const key = cursorApiKey();
  if (!key) return null;
  // Basic auth: API key as username, empty password (Cursor also accepts Bearer)
  const token = Buffer.from(`${key}:`).toString('base64');
  return `Basic ${token}`;
}

async function cursorFetch(path, { method = 'GET', body } = {}) {
  const auth = authHeader();
  if (!auth) {
    return {
      ok: false,
      error: 'cursor_api_key_missing',
      hint: 'Set CURSOR_API_KEY on the Pain agent VPS (Cursor Dashboard → API Keys).',
    };
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: auth,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    return {
      ok: false,
      error: 'cursor_api_error',
      status: res.status,
      detail: json,
    };
  }
  return { ok: true, data: json };
}

function resolveRepo(repoKey = 'liberview') {
  const key = String(repoKey || 'liberview')
    .trim()
    .toLowerCase()
    .replace(/^gogoneriel\//, '');
  if (key === 'ether-game' || key === 'ethergame') return ALLOWED_REPOS['ether-game'];
  return ALLOWED_REPOS.liberview;
}

function buildPrompt({ request, specPath }) {
  const specLine = specPath
    ? `Design spec path (read it first): ${specPath}`
    : 'No separate design-doc path was provided; follow the owner request below.';
  return `You are implementing a game change for LiberWallet / Tale of Liber on behalf of Pain (the owner's game builder).

${specLine}

Owner request (plain language — honor the intent):
${String(request || '').trim()}

Rules:
- Work ONLY on the \`${PREVIEW_BRANCH}\` branch (already checked out / workOnCurrentBranch). Do not merge to main. Do not open a PR unless asked.
- Game client code lives under \`src/game/\`. Shell under \`src/app/dashboard/governance/game/\`.
- Before exploring, run \`graphify query "<question>"\` if graphify-out exists (see .cursor/rules/graphify.mdc).
- Prefer small, visible, shippable changes. Match existing Phaser / Next.js patterns.
- Keep secrets out of git. Do not invent undeployed contract addresses.
- When done, summarize what changed in plain words for a non-technical owner.

Preview site after deploy: ${PREVIEW_URL}`;
}

/**
 * One-at-a-time guard: list recent agents and see if any LiberWallet/pain run is active.
 */
async function findBusyPainAgent() {
  const listed = await cursorFetch('/agents?limit=20&includeArchived=false');
  if (!listed.ok) return listed;
  const items = listed.data?.items || [];
  for (const ag of items) {
    if (!ag?.id || ag.status === 'ARCHIVED') continue;
    const runId = ag.latestRunId;
    if (!runId) continue;
    const run = await cursorFetch(`/agents/${ag.id}/runs/${runId}`);
    if (!run.ok) continue;
    const st = (run.data?.status || '').toUpperCase();
    if (st === 'CREATING' || st === 'RUNNING') {
      return {
        ok: true,
        busy: true,
        agentId: ag.id,
        agentUrl: ag.url,
        runStatus: st,
        name: ag.name,
      };
    }
  }
  return { ok: true, busy: false };
}

/**
 * @param {{ request: string, specPath?: string, repo?: string }} args
 */
export async function startGameChange(args = {}) {
  const request = String(args.request || '').trim();
  if (!request) {
    return { ok: false, error: 'request_required' };
  }
  if (request.length > 8000) {
    return { ok: false, error: 'request_too_long', max: 8000 };
  }

  const busy = await findBusyPainAgent();
  if (!busy.ok) return busy;
  if (busy.busy) {
    return {
      ok: false,
      error: 'agent_already_running',
      agentId: busy.agentId,
      agentUrl: busy.agentUrl,
      runStatus: busy.runStatus,
      hint: 'Only one Pain change at a time. Use check_game_change, or wait until it finishes.',
      previewUrl: PREVIEW_URL,
    };
  }

  const repoUrl = resolveRepo(args.repo);
  const body = {
    prompt: {
      text: buildPrompt({
        request,
        specPath: args.specPath ? String(args.specPath).trim() : '',
      }),
    },
    name: `Pain: ${request.slice(0, 60)}`.trim(),
    repos: [
      {
        url: repoUrl,
        startingRef: PREVIEW_BRANCH,
      },
    ],
    workOnCurrentBranch: true,
    autoCreatePR: false,
    skipReviewerRequest: true,
  };

  const created = await cursorFetch('/agents', { method: 'POST', body });
  if (!created.ok) return created;

  const agent = created.data?.agent || created.data;
  const run = created.data?.run;
  lastAgentId = agent?.id || null;

  return {
    ok: true,
    agentId: agent?.id,
    agentUrl: agent?.url || (agent?.id ? `https://cursor.com/agents/${agent.id}` : null),
    runId: run?.id || agent?.latestRunId,
    runStatus: run?.status || 'CREATING',
    branch: PREVIEW_BRANCH,
    previewUrl: PREVIEW_URL,
    repoUrl,
    message:
      'Change started on the pain preview branch. Tell the owner to open pain.liberether.com in ~2 minutes after the agent finishes.',
  };
}

/**
 * @param {{ id?: string }} args
 */
export async function checkGameChange(args = {}) {
  const id = String(args.id || lastAgentId || '').trim();
  if (!id) {
    return {
      ok: false,
      error: 'agent_id_required',
      hint: 'Pass the agent id from start_game_change, or start a change first.',
    };
  }

  const agentRes = await cursorFetch(`/agents/${id}`);
  if (!agentRes.ok) return agentRes;
  const agent = agentRes.data;
  const runId = agent?.latestRunId;
  let run = null;
  if (runId) {
    const runRes = await cursorFetch(`/agents/${id}/runs/${runId}`);
    if (runRes.ok) run = runRes.data;
  }

  const runStatus = (run?.status || 'UNKNOWN').toUpperCase();
  const finished = ['FINISHED', 'COMPLETED', 'DONE'].includes(runStatus);
  const failed = ['FAILED', 'CANCELLED', 'ERROR', 'EXPIRED'].includes(runStatus);

  lastAgentId = id;

  return {
    ok: true,
    agentId: id,
    agentUrl: agent?.url || `https://cursor.com/agents/${id}`,
    agentStatus: agent?.status,
    runId,
    runStatus,
    finished,
    failed,
    resultText: run?.result?.text || run?.text || null,
    branches: run?.git?.branches || null,
    previewUrl: PREVIEW_URL,
    message: finished
      ? `Done — look at ${PREVIEW_URL} in about 2 minutes (Vercel deploy).`
      : failed
        ? 'The change failed or was cancelled. Ask the owner if they want to try again.'
        : `Still ${runStatus.toLowerCase()}. Check again soon.`,
  };
}
