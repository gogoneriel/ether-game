import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_REPO = 'https://github.com/gogoneriel/ether-game.git';

export function repoDir() {
  return (process.env.REPO_DIR || '/data/ether-game').trim();
}

export function repoUrl() {
  return (process.env.REPO_URL || DEFAULT_REPO).trim();
}

/** Classic PAT (or fine-grained) for Pain2023 — never logged. */
export function githubToken() {
  return (process.env.GITHUB_TOKEN || '').trim();
}

export function gitAuthorName() {
  return (process.env.GIT_AUTHOR_NAME || 'Pain2023').trim();
}

export function gitAuthorEmail() {
  return (
    process.env.GIT_AUTHOR_EMAIL || 'Pain2023@users.noreply.github.com'
  ).trim();
}

/**
 * Public HTTPS URL → authenticated URL when GITHUB_TOKEN is set.
 * Uses x-access-token form so the token never appears in git commit metadata.
 */
export function authenticatedRepoUrl(url = repoUrl()) {
  const token = githubToken();
  if (!token) return url;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return url;
    u.username = 'x-access-token';
    u.password = token;
    return u.toString();
  } catch {
    return url;
  }
}

/** Redact token from strings before returning to the LLM / logs. */
export function redactSecrets(text) {
  if (!text) return text;
  let out = String(text);
  const token = githubToken();
  if (token) out = out.split(token).join('[REDACTED]');
  out = out.replace(
    /https:\/\/x-access-token:[^@\s]+@/gi,
    'https://x-access-token:[REDACTED]@',
  );
  out = out.replace(/ghp_[A-Za-z0-9]+/g, '[REDACTED]');
  out = out.replace(/github_pat_[A-Za-z0-9_]+/g, '[REDACTED]');
  return out;
}

export function runGit(args, cwd, envExtra = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      ...envExtra,
    },
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: redactSecrets((result.stdout || '').trim()),
    stderr: redactSecrets((result.stderr || '').trim()),
  };
}

/** Configure local commit identity for Pain2023 in the clone. */
export function ensureGitIdentity(dir = repoDir()) {
  const name = gitAuthorName();
  const email = gitAuthorEmail();
  runGit(['config', 'user.name', name], dir);
  runGit(['config', 'user.email', email], dir);
  return { name, email };
}

/** Shallow clone or pull. Safe to call on an interval. */
export function syncRepo() {
  const dir = repoDir();
  const publicUrl = repoUrl();
  const url = authenticatedRepoUrl(publicUrl);
  mkdirSync(dir, { recursive: true });

  const gitDir = join(dir, '.git');
  if (!existsSync(gitDir)) {
    const entries = existsSync(dir) ? readdirSync(dir) : [];
    if (entries.length === 0) {
      const clone = runGit(
        ['clone', '--depth', '1', '--single-branch', url, dir],
        process.cwd(),
      );
      if (clone.ok) ensureGitIdentity(dir);
      return {
        action: 'clone',
        ok: clone.ok,
        detail: clone.ok ? 'cloned' : clone.stderr || clone.stdout,
        dir,
        url: publicUrl,
        authenticated: Boolean(githubToken()),
      };
    }
    const clone = runGit(
      ['clone', '--depth', '1', '--single-branch', url, '.'],
      dir,
    );
    if (clone.ok) ensureGitIdentity(dir);
    return {
      action: 'clone',
      ok: clone.ok,
      detail: clone.ok ? 'cloned-into-existing' : clone.stderr || clone.stdout,
      dir,
      url: publicUrl,
      authenticated: Boolean(githubToken()),
    };
  }

  runGit(['remote', 'set-url', 'origin', url], dir);
  ensureGitIdentity(dir);
  const fetch = runGit(['fetch', '--depth', '1', 'origin'], dir);
  if (!fetch.ok) {
    return {
      action: 'fetch',
      ok: false,
      detail: fetch.stderr || fetch.stdout,
      dir,
      url: publicUrl,
      authenticated: Boolean(githubToken()),
    };
  }
  const pull = runGit(['reset', '--hard', 'origin/HEAD'], dir);
  return {
    action: 'pull',
    ok: pull.ok,
    detail: pull.ok ? pull.stdout || 'updated' : pull.stderr || pull.stdout,
    dir,
    url: publicUrl,
    authenticated: Boolean(githubToken()),
  };
}

const MAX_FILE_BYTES = 80_000;
const ALLOWED_EXT = new Set([
  '.md',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.sol',
  '.yml',
  '.yaml',
  '.css',
  '.txt',
]);

function isPathInside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith('..'));
}

/** Read a file from the cloned repo (path relative to repo root). */
export function readRepoFile(relPath) {
  if (!relPath || typeof relPath !== 'string') {
    return { ok: false, error: 'bad_path' };
  }
  const cleaned = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    cleaned.includes('..') ||
    cleaned.startsWith('.git/') ||
    cleaned.includes('\0')
  ) {
    return { ok: false, error: 'path_forbidden' };
  }

  const root = repoDir();
  const full = join(root, cleaned);
  if (!isPathInside(root, full)) {
    return { ok: false, error: 'path_escape' };
  }
  if (!existsSync(full)) {
    return { ok: false, error: 'not_found', path: cleaned };
  }
  const st = statSync(full);
  if (!st.isFile()) {
    return { ok: false, error: 'not_a_file', path: cleaned };
  }
  if (st.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: 'too_large',
      path: cleaned,
      size: st.size,
      max: MAX_FILE_BYTES,
    };
  }
  const ext = cleaned.includes('.')
    ? `.${cleaned.split('.').pop().toLowerCase()}`
    : '';
  if (ext && !ALLOWED_EXT.has(ext)) {
    return { ok: false, error: 'ext_forbidden', path: cleaned, ext };
  }

  const content = readFileSync(full, 'utf8');
  return { ok: true, path: cleaned, content, bytes: Buffer.byteLength(content) };
}

export function listRepoTree(relDir = '', depth = 2) {
  const root = repoDir();
  const base = relDir
    ? join(root, relDir.replace(/\\/g, '/').replace(/^\/+/, ''))
    : root;
  if (!existsSync(base) || !isPathInside(root, base)) {
    return { ok: false, error: 'not_found' };
  }

  const out = [];
  function walk(dir, d) {
    if (d < 0) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name === '.git' || ent.name === 'node_modules') continue;
      const full = join(dir, ent.name);
      const rel = relative(root, full).replace(/\\/g, '/');
      if (ent.isDirectory()) {
        out.push(`${rel}/`);
        walk(full, d - 1);
      } else {
        out.push(rel);
      }
      if (out.length >= 200) return;
    }
  }
  walk(base, depth);
  return { ok: true, entries: out };
}

if (process.argv.includes('--once')) {
  const result = syncRepo();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
