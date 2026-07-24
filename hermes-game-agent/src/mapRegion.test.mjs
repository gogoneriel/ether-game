import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clampRect,
  expandWithMargin,
  featherAlpha,
  resolveAnchorRect,
} from './mapRegion.mjs';

describe('clampRect', () => {
  it('clamps negative origin toward zero', () => {
    const r = clampRect({ x: -10, y: -10, w: 200, h: 200 });
    assert.equal(r.ok, true);
    assert.equal(r.rect.x, 0);
    assert.equal(r.rect.y, 0);
    assert.equal(r.rect.w, 190);
    assert.equal(r.rect.h, 190);
  });

  it('clamps overflow at map edge', () => {
    const r = clampRect({ x: 1700, y: 1300, w: 400, h: 400 });
    assert.equal(r.ok, true);
    assert.ok(r.rect.x + r.rect.w <= 1792);
    assert.ok(r.rect.y + r.rect.h <= 1408);
  });

  it('rejects tiny rects', () => {
    const r = clampRect({ x: 0, y: 0, w: 10, h: 10 });
    assert.equal(r.ok, false);
    assert.equal(r.error, 'bad_rect');
  });

  it('rejects NaN', () => {
    const r = clampRect({ x: NaN, y: 0, w: 100, h: 100 });
    assert.equal(r.ok, false);
    assert.equal(r.error, 'bad_rect');
  });
});

describe('expandWithMargin', () => {
  it('grows inward-offset rect by margin', () => {
    const e = expandWithMargin({ x: 64, y: 64, w: 128, h: 128 }, 64);
    assert.equal(e.ok, true);
    assert.deepEqual(e.rect, { x: 0, y: 0, w: 256, h: 256 });
    assert.equal(e.innerOffsetX, 64);
    assert.equal(e.innerOffsetY, 64);
  });

  it('does not go negative at map edge', () => {
    const e = expandWithMargin({ x: 0, y: 0, w: 128, h: 128 }, 64);
    assert.equal(e.ok, true);
    assert.equal(e.rect.x, 0);
    assert.equal(e.rect.y, 0);
    assert.equal(e.innerOffsetX, 0);
    assert.equal(e.innerOffsetY, 0);
    assert.equal(e.rect.w, 192);
    assert.equal(e.rect.h, 192);
  });
});

describe('resolveAnchorRect', () => {
  const fixture = {
    anchors: { fountain: { x: 768, y: 512, w: 320, h: 320 } },
  };

  it('returns a known anchor rect', () => {
    const r = resolveAnchorRect(fixture, 'fountain');
    assert.equal(r.ok, true);
    assert.deepEqual(r.rect, { x: 768, y: 512, w: 320, h: 320 });
  });

  it('lists known anchors on unknown name', () => {
    const r = resolveAnchorRect(fixture, 'nope');
    assert.equal(r.ok, false);
    assert.equal(r.error, 'unknown_anchor');
    assert.ok(r.known.includes('fountain'));
  });

  it('handles null input without throwing', () => {
    const r = resolveAnchorRect(null, 'x');
    assert.equal(r.ok, false);
  });
});

describe('featherAlpha', () => {
  // Expanded 256x256 crop, margin 64, inner 128x128 at (64,64)
  const args = [256, 256, 64, 64, 64, 128, 128];

  it('is fully opaque at the inner center', () => {
    assert.equal(featherAlpha(128, 128, ...args), 255);
  });

  it('is fully transparent at the outer corner', () => {
    assert.equal(featherAlpha(0, 0, ...args), 0);
  });

  it('ramps linearly halfway through the margin band', () => {
    const a = featherAlpha(32, 128, ...args);
    assert.ok(a >= 100 && a <= 160, `expected ~127, got ${a}`);
  });
});
