/**
 * Unit check for stale-remote fade-out gate.
 * Run: node scripts/verify-stale-remote.mjs
 */
import assert from 'node:assert/strict';

const REMOTE_STALE_MS = 3000;

function shouldFadeRemove(lastSampleAt, now) {
  return now - lastSampleAt > REMOTE_STALE_MS;
}

const t0 = 10_000;
assert.equal(shouldFadeRemove(t0, t0 + 2999), false, 'under threshold stays');
assert.equal(shouldFadeRemove(t0, t0 + 3001), true, 'over threshold fades');
assert.equal(shouldFadeRemove(t0, t0), false, 'fresh sample stays');

// Simulates map leave: last sample then silence
let lastSampleAt = 0;
const samples = [0, 100, 200]; // then silence
for (const t of samples) lastSampleAt = t;
assert.equal(shouldFadeRemove(lastSampleAt, 200 + 2500), false);
assert.equal(shouldFadeRemove(lastSampleAt, 200 + 3100), true);

console.log('PASS stale remote checks');
