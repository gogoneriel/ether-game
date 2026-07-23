import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  authenticatedRepoUrl,
  ensureGitIdentity,
  githubToken,
  gitAuthorEmail,
  gitAuthorName,
  redactSecrets,
  repoDir,
  repoUrl,
  runGit,
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
      hint: 'Set GITHUB_TOKEN (Pain2023 classic PAT with repo scope) on the Hermes VPS.',
    };
  }
  return { ok: true, token };
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
    // Allow bare filename → docs/design/<name>
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
 * Pull, write markdown under docs/design/, commit as Pain2023, push.
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

  const sync = syncRepo();
  if (!sync.ok) {
    return {
      ok: false,
      error: 'sync_failed',
      detail: sync.detail,
    };
  }

  const dir = repoDir();
  ensureGitIdentity(dir);
  const full = join(dir, ...norm.path.split('/'));
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

  const add = runGit(['add', '--', norm.path], dir);
  if (!add.ok) {
    return { ok: false, error: 'git_add_failed', detail: add.stderr || add.stdout };
  }

  const status = runGit(['status', '--porcelain', '--', norm.path], dir);
  if (!status.stdout) {
    return {
      ok: true,
      noop: true,
      path: norm.path,
      detail: 'no_changes',
    };
  }

  const rawMsg = (args.message || `update ${norm.path}`).trim().slice(0, 200);
  const message = rawMsg.startsWith('Hermes:')
    ? rawMsg
    : `Hermes: ${rawMsg}`;

  const name = gitAuthorName();
  const email = gitAuthorEmail();
  const commit = runGit(
    ['commit', '-m', message],
    dir,
    {
      GIT_AUTHOR_NAME: name,
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name,
      GIT_COMMITTER_EMAIL: email,
    },
  );
  if (!commit.ok) {
    return {
      ok: false,
      error: 'git_commit_failed',
      detail: commit.stderr || commit.stdout,
    };
  }

  const sha = runGit(['rev-parse', 'HEAD'], dir);
  const authUrl = authenticatedRepoUrl();
  runGit(['remote', 'set-url', 'origin', authUrl], dir);
  const push = runGit(['push', 'origin', 'HEAD'], dir);
  if (!push.ok) {
    return {
      ok: false,
      error: 'git_push_failed',
      detail: push.stderr || push.stdout,
      commitSha: sha.ok ? sha.stdout : undefined,
    };
  }

  const { owner, repo } = repoSlug();
  const commitSha = sha.ok ? sha.stdout : '';
  const commitUrl = commitSha
    ? `https://github.com/${owner}/${repo}/commit/${commitSha}`
    : `https://github.com/${owner}/${repo}`;
  const fileUrl = `https://github.com/${owner}/${repo}/blob/main/${norm.path}`;

  return {
    ok: true,
    path: norm.path,
    message,
    author: name,
    commitSha,
    commitUrl,
    fileUrl,
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

  try {
    const res = await fetch(
      `${githubApiBase()}/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${tok.token}`,
          'content-type': 'application/json',
          'user-agent': 'hermes-game-agent',
          'x-github-api-version': '2022-11-28',
        },
        body: JSON.stringify({
          title,
          body,
          ...(labels.length ? { labels } : {}),
        }),
      },
    );
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        error: 'github_api_error',
        status: res.status,
        detail: redactSecrets(
          (json && (json.message || JSON.stringify(json))) || text,
        ).slice(0, 500),
      };
    }
    return {
      ok: true,
      number: json?.number,
      url: json?.html_url,
      title: json?.title,
      author: gitAuthorName(),
    };
  } catch (err) {
    return {
      ok: false,
      error: 'github_fetch_failed',
      detail: redactSecrets(err?.message || String(err)),
    };
  }
}
