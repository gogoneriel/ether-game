import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { repoDir } from './repoSync.mjs';

const DEFAULT_MAX_CHARS = 40_000;
const SKIP_NAMES = new Set(['_TEMPLATE-feature-spec.md']);

/** @type {{ key: string, text: string, mtime: number, files: string[] }} */
let cached = { key: '', text: '', mtime: 0, files: [] };

/**
 * Collect markdown under docs/design/** and top-level docs/*.md from the
 * synced ether-game clone. Phone edits land here after hourly (or forced) sync.
 */
export function loadDesignDocs() {
  const root = repoDir();
  const max = Number(process.env.DESIGN_DOCS_MAX_CHARS || DEFAULT_MAX_CHARS);
  const docsRoot = join(root, 'docs');

  if (!existsSync(docsRoot)) {
    return {
      text: '(ether-game docs/ not present in clone yet — run /agent/repo/sync)',
      files: [],
      missing: true,
      truncated: false,
    };
  }

  /** @type {{ rel: string, full: string, mtime: number }[]} */
  const found = [];

  function addMd(full, rel) {
    const base = rel.split('/').pop() || '';
    if (!base.endsWith('.md')) return;
    if (SKIP_NAMES.has(base) || base.startsWith('_TEMPLATE')) return;
    try {
      const st = statSync(full);
      if (!st.isFile()) return;
      found.push({ rel, full, mtime: st.mtimeMs });
    } catch {
      /* skip */
    }
  }

  // Top-level docs/*.md
  try {
    for (const name of readdirSync(docsRoot)) {
      const full = join(docsRoot, name);
      addMd(full, `docs/${name}`);
    }
  } catch {
    /* skip */
  }

  // docs/design/**/*.md (recursive)
  const designRoot = join(docsRoot, 'design');
  if (existsSync(designRoot)) {
    walkMd(designRoot, (full) => {
      const rel = relative(root, full).replace(/\\/g, '/');
      addMd(full, rel);
    });
  }

  // Prefer design/ files first, then parent docs; newest mtime last for truncation headroom
  found.sort((a, b) => {
    const aDesign = a.rel.startsWith('docs/design/') ? 0 : 1;
    const bDesign = b.rel.startsWith('docs/design/') ? 0 : 1;
    if (aDesign !== bDesign) return aDesign - bDesign;
    return a.rel.localeCompare(b.rel);
  });

  const key = found.map((f) => `${f.rel}:${f.mtime}`).join('|');
  const newest = found.reduce((m, f) => Math.max(m, f.mtime), 0);
  if (cached.key === key && cached.text) {
    return {
      text: cached.text,
      files: cached.files,
      missing: false,
      truncated: cached.text.includes('…[design docs truncated'),
    };
  }

  const parts = [];
  let used = 0;
  let truncated = false;
  const included = [];

  for (const f of found) {
    let body;
    try {
      body = readFileSync(f.full, 'utf8');
    } catch {
      continue;
    }
    const header = `\n\n### ${f.rel}\n\n`;
    const chunk = `${header}${body.trim()}\n`;
    if (used + chunk.length > max) {
      const remain = max - used - header.length - 80;
      if (remain > 200) {
        parts.push(
          `${header}${body.trim().slice(0, remain)}\n\n…[design docs truncated at ${max} chars]\n`,
        );
        included.push(f.rel);
      } else {
        parts.push(`\n\n…[design docs truncated at ${max} chars]\n`);
      }
      truncated = true;
      break;
    }
    parts.push(chunk);
    used += chunk.length;
    included.push(f.rel);
  }

  const text =
    included.length === 0
      ? '(no design markdown found under docs/ or docs/design/)'
      : `Live design docs from ether-game clone (${included.length} files):\n${parts.join('')}`;

  cached = { key, text, mtime: newest, files: included };
  return { text, files: included, missing: included.length === 0, truncated };
}

/** @param {string} dir @param {(full: string) => void} onFile */
function walkMd(dir, onFile) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walkMd(full, onFile);
    else if (ent.name.endsWith('.md')) onFile(full);
  }
}
