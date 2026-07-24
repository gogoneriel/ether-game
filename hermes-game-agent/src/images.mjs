/**
 * Map / concept image generation via OpenRouter Gemini image model.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { writeBinaryDesignFile } from './github.mjs';
import { repoDir } from './repoSync.mjs';

const IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Resolve a reference image path strictly inside the ether-game clone.
 * @param {string} referencePath
 */
export function resolveReferencePath(referencePath) {
  if (!referencePath || typeof referencePath !== 'string') {
    return { ok: false, error: 'bad_reference_path' };
  }
  const cleaned = referencePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    cleaned.includes('..') ||
    cleaned.includes('\0') ||
    cleaned.startsWith('/') ||
    /^[a-zA-Z]:/.test(cleaned)
  ) {
    return { ok: false, error: 'path_forbidden' };
  }
  const root = resolve(repoDir());
  const abs = resolve(join(root, cleaned));
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) {
    return { ok: false, error: 'path_outside_repo' };
  }
  if (!existsSync(abs)) {
    return { ok: false, error: 'reference_not_found', path: cleaned };
  }
  return { ok: true, path: cleaned, abs };
}

function decodeDataUrl(dataUrl) {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(
    String(dataUrl || '').replace(/\s/g, ''),
  );
  if (!m) return null;
  return Buffer.from(m[2], 'base64');
}

/**
 * @param {{ prompt: string, name: string, referencePath?: string }} args
 */
export async function generateMapImage(args = {}) {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, error: 'OPENROUTER_API_KEY_missing' };
  }

  const prompt = String(args.prompt || '').trim();
  if (!prompt) return { ok: false, error: 'empty_prompt' };

  const name = String(args.name || '')
    .trim()
    .toLowerCase();
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      error: 'bad_name',
      hint: 'name must be kebab-case letters/digits (e.g. magnolia-plaza-v2)',
    };
  }

  /** @type {Array<object>} */
  const content = [{ type: 'text', text: prompt }];
  if (args.referencePath) {
    const ref = resolveReferencePath(args.referencePath);
    if (!ref.ok) return ref;
    const bytes = readFileSync(ref.abs);
    const b64 = bytes.toString('base64');
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${b64}` },
    });
  }

  const base = (
    process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  ).replace(/\/$/, '');

  let res;
  let json;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wallet.liberether.com',
        'X-Title': 'Pain Game Builder',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content }],
      }),
    });
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: 'openrouter_non_json',
        status: res.status,
        detail: text.slice(0, 300),
      };
    }
  } catch (e) {
    return {
      ok: false,
      error: 'openrouter_fetch_failed',
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: 'openrouter_http_error',
      status: res.status,
      detail: (json?.error?.message || JSON.stringify(json)).slice(0, 400),
    };
  }

  const msg = json?.choices?.[0]?.message;
  const images = msg?.images;
  let buf = null;
  if (Array.isArray(images) && images.length) {
    const url =
      images[0]?.image_url?.url ||
      images[0]?.imageUrl?.url ||
      images[0]?.url;
    buf = decodeDataUrl(url);
  }
  if (!buf && typeof msg?.content === 'string') {
    const m = msg.content.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/);
    if (m) buf = decodeDataUrl(m[0]);
  }
  if (!buf && Array.isArray(msg?.content)) {
    for (const part of msg.content) {
      const url = part?.image_url?.url || part?.url;
      buf = decodeDataUrl(url);
      if (buf) break;
    }
  }

  if (!buf || !buf.length) {
    const detail =
      typeof msg?.content === 'string'
        ? msg.content.slice(0, 300)
        : JSON.stringify(msg?.content || msg || {}).slice(0, 300);
    return { ok: false, error: 'no_image_in_response', detail };
  }

  const path = `docs/design/maps/${name}.png`;
  const written = await writeBinaryDesignFile({
    path,
    buffer: buf,
    message: `map image ${name}`,
  });
  if (!written.ok) return written;

  const { owner, repo } = (() => {
    // Match github.mjs defaults
    return { owner: 'gogoneriel', repo: 'ether-game' };
  })();
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;

  return {
    ok: true,
    path,
    htmlUrl: written.fileUrl,
    rawUrl,
    commitUrl: written.commitUrl,
    message:
      'Image committed. Show the owner with markdown: ![' +
      name +
      '](' +
      rawUrl +
      ')',
  };
}
