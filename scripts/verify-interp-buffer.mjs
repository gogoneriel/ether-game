/**
 * Unit checks for remote interpolation buffer.
 * Run: node scripts/verify-interp-buffer.mjs
 */
import assert from 'node:assert/strict';

const INTERP_DELAY_MS = 150;
const EXTRAP_MAX_MS = 100;
const SNAP_GAP_PX = 200;
const MAX_SAMPLES = 10;

function pushSample(buf, sample) {
  buf.push(sample);
  while (buf.length > MAX_SAMPLES) buf.shift();
  return buf;
}

function sampleAt(buf, now, delayMs = INTERP_DELAY_MS) {
  if (buf.length === 0) return null;
  const renderT = now - delayMs;
  const first = buf[0];
  const last = buf[buf.length - 1];
  if (renderT <= first.t) {
    return { x: first.x, y: first.y, facing: first.facing, moving: false };
  }
  for (let i = 0; i < buf.length - 1; i++) {
    const a = buf[i];
    const b = buf[i + 1];
    if (renderT >= a.t && renderT <= b.t) {
      const span = b.t - a.t || 1;
      const u = (renderT - a.t) / span;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.hypot(dx, dy) > SNAP_GAP_PX) {
        return { x: b.x, y: b.y, facing: b.facing, moving: false };
      }
      return {
        x: a.x + dx * u,
        y: a.y + dy * u,
        facing: u < 0.5 ? a.facing : b.facing,
        moving: Math.hypot(dx, dy) > 1,
      };
    }
  }
  const dt = Math.min(renderT - last.t, EXTRAP_MAX_MS);
  if (buf.length >= 2 && dt > 0) {
    const prev = buf[buf.length - 2];
    const span = last.t - prev.t || 1;
    const vx = (last.x - prev.x) / span;
    const vy = (last.y - prev.y) / span;
    if (renderT - last.t > EXTRAP_MAX_MS) {
      return { x: last.x, y: last.y, facing: last.facing, moving: false };
    }
    return {
      x: last.x + vx * dt,
      y: last.y + vy * dt,
      facing: last.facing,
      moving: Math.hypot(vx, vy) > 0.02,
    };
  }
  return { x: last.x, y: last.y, facing: last.facing, moving: false };
}

const buf = [];
pushSample(buf, { x: 0, y: 0, facing: 'right', t: 1000 });
pushSample(buf, { x: 100, y: 0, facing: 'right', t: 1100 });

// At now=1250, renderT=1100 → exactly at second sample
const mid = sampleAt(buf, 1250);
assert.ok(mid);
assert.ok(Math.abs(mid.x - 100) < 0.5, `expected ~100 got ${mid.x}`);

// Midway interpolate: now=1200 → renderT=1050 → halfway
const half = sampleAt(buf, 1200);
assert.ok(half);
assert.ok(Math.abs(half.x - 50) < 1, `expected ~50 got ${half.x}`);
assert.equal(half.moving, true);

// Snap on large gap
const big = [];
pushSample(big, { x: 0, y: 0, facing: 'down', t: 1000 });
pushSample(big, { x: 500, y: 0, facing: 'down', t: 1100 });
const snapped = sampleAt(big, 1200);
assert.ok(snapped);
assert.equal(snapped.x, 500, 'snap past gap');

// Extrapolate then hold
const ex = [];
pushSample(ex, { x: 0, y: 0, facing: 'right', t: 1000 });
pushSample(ex, { x: 100, y: 0, facing: 'right', t: 1100 });
const extrap = sampleAt(ex, 1300); // renderT=1150 = 50ms past last
assert.ok(extrap);
assert.ok(extrap.x > 100, 'extrapolates forward');
const held = sampleAt(ex, 1500); // renderT=1350 far past
assert.ok(held);
assert.equal(held.x, 100, 'holds after extrap cap');

console.log('PASS interp buffer checks');
