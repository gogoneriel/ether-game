import type { GameFacing } from '@/game/EventBus';

export type SnapSample = {
  x: number;
  y: number;
  facing: GameFacing;
  t: number;
};

export const INTERP_DELAY_MS = 150;
export const EXTRAP_MAX_MS = 100;
export const SNAP_GAP_PX = 200;
export const MAX_SAMPLES = 10;

/** Push a sample, keeping newest-first chronological order (ascending t). */
export function pushSample(
  buf: SnapSample[],
  sample: SnapSample,
): SnapSample[] {
  buf.push(sample);
  while (buf.length > MAX_SAMPLES) buf.shift();
  return buf;
}

/**
 * Sample the buffer at renderTime = now - INTERP_DELAY_MS.
 * Interpolates between surrounding samples; extrapolates up to EXTRAP_MAX_MS;
 * snaps when gap > SNAP_GAP_PX.
 */
export function sampleAt(
  buf: SnapSample[],
  now: number,
  delayMs = INTERP_DELAY_MS,
): { x: number; y: number; facing: GameFacing; moving: boolean } | null {
  if (buf.length === 0) return null;
  const renderT = now - delayMs;
  const first = buf[0]!;
  const last = buf[buf.length - 1]!;

  // Before first sample — hold first.
  if (renderT <= first.t) {
    return { x: first.x, y: first.y, facing: first.facing, moving: false };
  }

  // Between samples — interpolate.
  for (let i = 0; i < buf.length - 1; i++) {
    const a = buf[i]!;
    const b = buf[i + 1]!;
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

  // Past newest — extrapolate briefly, then hold.
  const dt = Math.min(renderT - last.t, EXTRAP_MAX_MS);
  if (buf.length >= 2 && dt > 0) {
    const prev = buf[buf.length - 2]!;
    const span = last.t - prev.t || 1;
    const vx = (last.x - prev.x) / span;
    const vy = (last.y - prev.y) / span;
    const speed = Math.hypot(vx, vy);
    if (speed * span > SNAP_GAP_PX) {
      return { x: last.x, y: last.y, facing: last.facing, moving: false };
    }
    if (renderT - last.t > EXTRAP_MAX_MS) {
      return { x: last.x, y: last.y, facing: last.facing, moving: false };
    }
    return {
      x: last.x + vx * dt,
      y: last.y + vy * dt,
      facing: last.facing,
      moving: speed > 0.02,
    };
  }

  return { x: last.x, y: last.y, facing: last.facing, moving: false };
}
