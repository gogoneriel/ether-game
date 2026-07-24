/**
 * Region-edit mockups: AI redraws only a patch; code pastes it onto the real map.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { writeBinaryDesignFile } from './github.mjs';
import { callImageModel, NAME_RE } from './images.mjs';
import { repoDir } from './repoSync.mjs';

export const MAP_W = 1792;
export const MAP_H = 1408;
export const MARGIN = 64;
const MIN_SIZE = 32;
const MAX_COMMIT = 8 * 1024 * 1024;

/**
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @param {number} [mapW]
 * @param {number} [mapH]
 */
export function clampRect(rect, mapW = MAP_W, mapH = MAP_H) {
  if (
    !rect ||
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.w) ||
    !Number.isFinite(rect.h)
  ) {
    return { ok: false, error: 'bad_rect' };
  }
  let x = Math.floor(rect.x);
  let y = Math.floor(rect.y);
  let w = Math.floor(rect.w);
  let h = Math.floor(rect.h);
  if (x < 0) {
    w += x;
    x = 0;
  }
  if (y < 0) {
    h += y;
    y = 0;
  }
  if (x + w > mapW) w = mapW - x;
  if (y + h > mapH) h = mapH - y;
  if (w < MIN_SIZE || h < MIN_SIZE) {
    return { ok: false, error: 'bad_rect' };
  }
  return { ok: true, rect: { x, y, w, h } };
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @param {number} [margin]
 * @param {number} [mapW]
 * @param {number} [mapH]
 */
export function expandWithMargin(
  rect,
  margin = MARGIN,
  mapW = MAP_W,
  mapH = MAP_H,
) {
  const leftWant = Math.max(0, rect.x - margin);
  const topWant = Math.max(0, rect.y - margin);
  const rightWant = Math.min(mapW, rect.x + rect.w + margin);
  const bottomWant = Math.min(mapH, rect.y + rect.h + margin);
  const expanded = {
    x: leftWant,
    y: topWant,
    w: rightWant - leftWant,
    h: bottomWant - topWant,
  };
  return {
    ok: true,
    rect: expanded,
    innerOffsetX: rect.x - expanded.x,
    innerOffsetY: rect.y - expanded.y,
  };
}

/**
 * @param {object|null} anchorsJson
 * @param {string} name
 */
export function resolveAnchorRect(anchorsJson, name) {
  const key = String(name || '')
    .trim()
    .toLowerCase();
  const anchors = anchorsJson?.anchors;
  if (!anchors || typeof anchors !== 'object') {
    return { ok: false, error: 'anchors_invalid' };
  }
  const known = Object.keys(anchors);
  const a = anchors[key];
  if (!a) {
    return { ok: false, error: 'unknown_anchor', known };
  }
  return clampRect({
    x: Number(a.x),
    y: Number(a.y),
    w: Number(a.w),
    h: Number(a.h),
  });
}

/**
 * Alpha 0..255 for feather mask: 255 in inner core, linear ramp across margin.
 * Crop coords are relative to the expanded crop; inner rect starts at (iox, ioy).
 */
export function featherAlpha(
  x,
  y,
  cropW,
  cropH,
  margin,
  innerOffsetX,
  innerOffsetY,
  innerW,
  innerH,
) {
  // Distance outside the inner rect (0 inside).
  const left = innerOffsetX;
  const top = innerOffsetY;
  const right = innerOffsetX + innerW;
  const bottom = innerOffsetY + innerH;

  let dx = 0;
  if (x < left) dx = left - x;
  else if (x >= right) dx = x - (right - 1);

  let dy = 0;
  if (y < top) dy = top - y;
  else if (y >= bottom) dy = y - (bottom - 1);

  const dist = Math.max(dx, dy);
  if (dist <= 0) return 255;
  if (dist >= margin) return 0;
  return Math.round(255 * (1 - dist / margin));
}

/**
 * Build a grayscale alpha mask buffer for the expanded crop.
 */
export function buildFeatherMask(
  cropW,
  cropH,
  margin,
  innerOffsetX,
  innerOffsetY,
  innerW,
  innerH,
) {
  const buf = Buffer.alloc(cropW * cropH);
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      buf[y * cropW + x] = featherAlpha(
        x,
        y,
        cropW,
        cropH,
        margin,
        innerOffsetX,
        innerOffsetY,
        innerW,
        innerH,
      );
    }
  }
  return buf;
}

/**
 * @param {{ anchor?: string, rect?: {x:number,y:number,w:number,h:number}, prompt: string, name: string }} args
 */
export async function editMapRegion(args = {}) {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) return { ok: false, error: 'empty_prompt' };

  let name = String(args.name || '')
    .trim()
    .toLowerCase();
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      error: 'bad_name',
      hint: 'name must be kebab-case (e.g. fountain-blue-v1)',
    };
  }
  const finalName = name.startsWith('mockup-') ? name : `mockup-${name}`;

  const root = repoDir();
  const anchorsPath = join(root, 'docs/design/maps/anchors.json');
  if (!existsSync(anchorsPath)) {
    return {
      ok: false,
      error: 'anchors_missing',
      hint: 'run repo sync; anchors.json must exist in ether-game docs/design/maps/',
    };
  }

  let anchorsJson;
  try {
    anchorsJson = JSON.parse(readFileSync(anchorsPath, 'utf8'));
  } catch {
    return { ok: false, error: 'anchors_invalid' };
  }

  let rectResult;
  if (args.anchor) {
    rectResult = resolveAnchorRect(anchorsJson, args.anchor);
  } else if (args.rect) {
    rectResult = clampRect(args.rect);
  } else {
    return {
      ok: false,
      error: 'missing_region',
      hint: 'pass anchor (preferred) or rect',
      known: Object.keys(anchorsJson.anchors || {}),
    };
  }
  if (!rectResult.ok) return rectResult;
  const rect = rectResult.rect;

  const fullPath = join(root, 'docs/design/maps/town-full.png');
  if (!existsSync(fullPath)) {
    return {
      ok: false,
      error: 'town_full_missing_or_wrong_size',
      hint: 'run npm run sync:map-refs in Liberview and commit town-full.png',
    };
  }
  const fullMeta = await sharp(fullPath).metadata();
  if (fullMeta.width !== MAP_W || fullMeta.height !== MAP_H) {
    return {
      ok: false,
      error: 'town_full_missing_or_wrong_size',
      detail: `${fullMeta.width}x${fullMeta.height}`,
    };
  }

  const expanded = expandWithMargin(rect, MARGIN, MAP_W, MAP_H);
  const { x: left, y: top, w: cropW, h: cropH } = expanded.rect;
  const { innerOffsetX, innerOffsetY } = expanded;

  const cropBuf = await sharp(fullPath)
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();

  const template = `Redraw this exact patch of a painted HD-2D fantasy town map. Apply ONLY this change: ${prompt}. Keep every other element's position, palette, lighting and perspective identical. Match the painterly pixel style. No text, no watermarks, no UI, no borders, no pure green (#00FF00).`;

  const content = [
    { type: 'text', text: template },
    {
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${cropBuf.toString('base64')}` },
    },
  ];

  const generated = await callImageModel(content);
  if (!generated.ok) return generated;

  const resizedPatch = await sharp(generated.buffer)
    .resize(cropW, cropH, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = buildFeatherMask(
    cropW,
    cropH,
    MARGIN,
    innerOffsetX,
    innerOffsetY,
    rect.w,
    rect.h,
  );

  // Apply feather mask onto the patch alpha channel.
  const rgba = Buffer.from(resizedPatch.data);
  for (let i = 0; i < cropW * cropH; i += 1) {
    const srcA = rgba[i * 4 + 3];
    rgba[i * 4 + 3] = Math.round((srcA * mask[i]) / 255);
  }

  const patchWithAlpha = await sharp(rgba, {
    raw: { width: cropW, height: cropH, channels: 4 },
  })
    .png()
    .toBuffer();

  const composite = await sharp(fullPath)
    .composite([{ input: patchWithAlpha, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const preview = await sharp(composite)
    .resize(896, 704, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, palette: true, quality: 85 })
    .toBuffer();

  const owner = 'gogoneriel';
  const repo = 'ether-game';
  let fullRawUrl;
  let fullSkipped = false;
  let commitUrl;
  let htmlUrl;

  if (composite.length <= MAX_COMMIT) {
    const written = await writeBinaryDesignFile({
      path: `docs/design/maps/${finalName}.png`,
      buffer: composite,
      message: `region mockup ${finalName}`,
    });
    if (!written.ok) return written;
    fullRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/docs/design/maps/${finalName}.png`;
    commitUrl = written.commitUrl;
    htmlUrl = written.fileUrl;
  } else {
    fullSkipped = true;
  }

  const previewWritten = await writeBinaryDesignFile({
    path: `docs/design/maps/${finalName}-preview.png`,
    buffer: preview,
    message: `region mockup preview ${finalName}`,
  });
  if (!previewWritten.ok) return previewWritten;

  const previewRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/docs/design/maps/${finalName}-preview.png`;
  if (!commitUrl) commitUrl = previewWritten.commitUrl;
  if (!htmlUrl) htmlUrl = previewWritten.fileUrl;

  return {
    ok: true,
    rect,
    expanded: expanded.rect,
    previewRawUrl,
    fullRawUrl,
    fullSkipped,
    htmlUrl,
    commitUrl,
    path: `docs/design/maps/${finalName}-preview.png`,
    message: `Show the owner: ![mockup](${previewRawUrl})`,
  };
}
