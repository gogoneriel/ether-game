import {
  githubToken,
  gitAuthorEmail,
  gitAuthorName,
  redactSecrets,
  repoUrl,
  syncRepo,
} from './repoSync.mjs';

const MAX_CONTENT_CHARS = 30_000;
const DEFAULT_OWNER = 'gogoneriel';
const DEFAULT_REPO = 'ether-game';

function githubApiBase() {
  return (process.env.GITHUB_API_BASE || 'https://api.github.com').replace(
    /\/+$/,
    '',
  );
}

function repoSlug() {
  const url = repoUrl();
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  } catch {
    /* fall through */
  }
  return { owner: DEFAULT_OWNER, repo: DEFAULT_REPO };
}

function requireToken() {
  const token = githubToken();
  if (!token) {
    return {
      ok: false,
      error: 'github_token_not_configured',
      hint: 'Set GITHUB_TOKEN to a Pain2023 classic PAT (ghp_...) with repo scope. Fine-grained tokens cannot write to another user personal repo.',
    };
  }
  return { ok: true, token };
}

async function ghJson(method, path, token, body) {
  const res = await fetch(`${githubApiBase()}${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'hermes-game-agent',
      'x-github-api-version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text.slice(0, 500) };
  }
  return { res, json, text };
}

/**
 * Guard: only markdown under docs/design/ (no templates, no escape).
 * @param {string} relPath
 */
export function normalizeDesignPath(relPath) {
  if (!relPath || typeof relPath !== 'string') {
    return { ok: false, error: 'bad_path' };
  }
  let cleaned = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (cleaned.includes('..') || cleaned.includes('\0')) {
    return { ok: false, error: 'path_forbidden' };
  }
  if (!cleaned.startsWith('docs/design/')) {
    if (!cleaned.includes('/')) {
      cleaned = `docs/design/${cleaned}`;
    } else {
      return {
        ok: false,
        error: 'path_must_be_under_docs_design',
        path: cleaned,
      };
    }
  }
  if (!cleaned.endsWith('.md')) {
    return { ok: false, error: 'must_be_markdown', path: cleaned };
  }
  const base = cleaned.split('/').pop() || '';
  if (base.startsWith('_TEMPLATE') || base.startsWith('.')) {
    return { ok: false, error: 'template_or_dotfile_forbidden', path: cleaned };
  }
  if (cleaned.split('/').length > 6) {
    return { ok: false, error: 'path_too_deep', path: cleaned };
  }
  return { ok: true, path: cleaned };
}

/**
 * Commit markdown under docs/design/ as Pain2023 via GitHub Contents API.
 * Requires a classic PAT (ghp_...) with repo scope — fine-grained PATs cannot
 * write to another user's personal repository even as a collaborator.
 * @param {{ path: string, content: string, message?: string }} args
 */
export async function writeDesignDoc(args = {}) {
  const tok = requireToken();
  if (!tok.ok) return tok;

  const norm = normalizeDesignPath(args.path);
  if (!norm.ok) return norm;

  const content = typeof args.content === 'string' ? args.content : '';
  if (!content.trim()) {
    return { ok: false, error: 'empty_content' };
  }
  if (content.length > MAX_CONTENT_CHARS) {
    return {
      ok: false,
      error: 'content_too_large',
      max: MAX_CONTENT_CHARS,
      size: content.length,
    };
  }

  const bodyText = content.endsWith('\n') ? content : `${content}\n`;
  const rawMsg = (args.message || `update ${norm.path}`).trim().slice(0, 200);
  const message =
    rawMsg.startsWith('Pain:') || rawMsg.startsWith('Hermes:')
      ? rawMsg
      : `Pain: ${rawMsg}`;
  const name = gitAuthorName();
  const email = gitAuthorEmail();
  const { owner, repo } = repoSlug();
  const apiPath = `/repos/${owner}/${repo}/contents/${norm.path}`;

  // Fetch existing sha if file already exists (required for updates).
  const existing = await ghJson('GET', apiPath, tok.token);
  let sha;
  if (existing.res.status === 200 && existing.json?.sha) {
    sha = existing.json.sha;
    const existingContent = Buffer.from(
      existing.json.content || '',
      'base64',
    ).toString('utf8');
    if (existingContent === bodyText) {
      return {
        ok: true,
        noop: true,
        path: norm.path,
        detail: 'no_changes',
        fileUrl: existing.json.html_url,
      };
    }
  } else if (existing.res.status !== 404) {
    const detail = redactSecrets(
      existing.json?.message || existing.text || String(existing.res.status),
    ).slice(0, 500);
    return {
      ok: false,
      error: 'github_api_error',
      status: existing.res.status,
      detail,
      hint:
        existing.res.status === 403
          ? 'Use a Pain2023 classic PAT (ghp_...) with repo scope. Fine-grained github_pat_ tokens cannot write to gogoneriel/ether-game.'
          : undefined,
    };
  }

  const payload = {
    message,
    content: Buffer.from(bodyText, 'utf8').toString('base64'),
    committer: { name, email },
    author: { name, email },
  };
  if (sha) payload.sha = sha;

  const put = await ghJson('PUT', apiPath, tok.token, payload);
  if (!put.res.ok) {
    const detail = redactSecrets(
      put.json?.message || put.text || String(put.res.status),
    ).slice(0, 500);
    return {
      ok: false,
      error: 'github_api_error',
      status: put.res.status,
      detail,
      hint:
        put.res.status === 403
          ? 'Use a Pain2023 classic PAT (ghp_...) with repo scope. Fine-grained github_pat_ tokens cannot write to gogoneriel/ether-game.'
          : undefined,
    };
  }

  // Refresh local clone so live design-doc ingestion sees the new file soon.
  try {
    syncRepo();
  } catch {
    /* best-effort */
  }

  const commitSha = put.json?.commit?.sha || '';
  const commitUrl =
    put.json?.commit?.html_url ||
    (commitSha
      ? `https://github.com/${owner}/${repo}/commit/${commitSha}`
      : `https://github.com/${owner}/${repo}`);
  const fileUrl =
    put.json?.content?.html_url ||
    `https://github.com/${owner}/${repo}/blob/main/${norm.path}`;

  return {
    ok: true,
    path: norm.path,
    message,
    author: name,
    commitSha,
    commitUrl,
    fileUrl,
    via: 'contents_api',
  };
}

/**
 * Open an issue on ether-game as Pain2023.
 * @param {{ title: string, body?: string, labels?: string[] }} args
 */
export async function openIssue(args = {}) {
  const tok = requireToken();
  if (!tok.ok) return tok;

  const title = String(args.title || '')
    .trim()
    .slice(0, 200);
  if (!title) return { ok: false, error: 'empty_title' };

  let body = String(args.body || '').trim().slice(0, 20_000);
  if (!body.includes('Hermes')) {
    body = `${body}\n\n_Opened by Hermes (Pain2023)._`.trim();
  }

  const { owner, repo } = repoSlug();
  const labels = Array.isArray(args.labels)
    ? args.labels.filter((l) => typeof l === 'string').slice(0, 5)
    : [];

  const { res, json, text } = await ghJson(
    'POST',
    `/repos/${owner}/${repo}/issues`,
    tok.token,
    {
      title,
      body,
      ...(labels.length ? { labels } : {}),
    },
  );

  if (!res.ok) {
    return {
      ok: false,
      error: 'github_api_error',
      status: res.status,
      detail: redactSecrets(
        (json && (json.message || JSON.stringify(json))) || text,
      ).slice(0, 500),
      hint:
        res.status === 403
          ? 'Use a Pain2023 classic PAT (ghp_...) with repo scope.'
          : undefined,
    };
  }
  return {
    ok: true,
    number: json?.number,
    url: json?.html_url,
    title: json?.title,
    author: gitAuthorName(),
  };
}

const LIBERVIEW_OWNER = 'gogoneriel';
const LIBERVIEW_REPO = 'Liberview';
const PREVIEW_BRANCH = 'pain';
const PROD_BASE = 'main';
const PREVIEW_URL = 'https://pain.liberether.com';

/**
 * Open (or reuse) a PR from pain → main on LiberWallet for the owner to merge.
 * Requires Pain2023 Write access on gogoneriel/Liberview.
 * @param {{ title?: string, body?: string }} args
 */
export async function shipPreview(args = {}) {
  const tok = requireToken();
  if (!tok.ok) return tok;

  const owner = LIBERVIEW_OWNER;
  const repo = LIBERVIEW_REPO;
  const head = PREVIEW_BRANCH;
  const base = PROD_BASE;

  // Idempotent: return existing open PR if present.
  const existing = await ghJson(
    'GET',
    `/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${head}&base=${base}&per_page=5`,
    tok.token,
  );
  if (existing.res.ok && Array.isArray(existing.json) && existing.json.length) {
    const pr = existing.json[0];
    return {
      ok: true,
      reused: true,
      number: pr.number,
      prUrl: pr.html_url,
      title: pr.title,
      head,
      base,
      previewUrl: PREVIEW_URL,
      message:
        'An open ship PR already exists. Tell the owner to review and merge it.',
    };
  }

  const title = String(
    args.title || 'Ship Pain preview → production',
  )
    .trim()
    .slice(0, 200);
  let body = String(
    args.body ||
      [
        '## Summary',
        `- Promote the public Pain sandbox (\`${head}\`) into LiberWallet production (\`${base}\`).`,
        `- Preview: ${PREVIEW_URL}`,
        '',
        '## Test plan',
        `- [ ] Open ${PREVIEW_URL} anonymously — game loads, no wallet login`,
        `- [ ] Spot-check town / battle after merge on wallet.liberether.com`,
        '',
        '_Opened by Pain (Pain2023) via ship_preview. Does not merge automatically._',
      ].join('\n'),
  )
    .trim()
    .slice(0, 20_000);

  const { res, json, text } = await ghJson(
    'POST',
    `/repos/${owner}/${repo}/pulls`,
    tok.token,
    { title, head, base, body },
  );

  if (!res.ok) {
    return {
      ok: false,
      error: 'github_api_error',
      status: res.status,
      detail: redactSecrets(
        (json && (json.message || JSON.stringify(json))) || text,
      ).slice(0, 500),
      hint:
        res.status === 403 || res.status === 404
          ? 'Invite Pain2023 as Write collaborator on gogoneriel/Liberview and use a classic PAT (repo scope).'
          : undefined,
      previewUrl: PREVIEW_URL,
    };
  }

  return {
    ok: true,
    reused: false,
    number: json?.number,
    prUrl: json?.html_url,
    title: json?.title,
    head,
    base,
    previewUrl: PREVIEW_URL,
    author: gitAuthorName(),
    message:
      'Ship PR opened. Tell the owner to review and merge on GitHub — nothing ships until they merge.',
  };
}
