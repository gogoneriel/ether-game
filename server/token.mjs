import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token format: `${address}.${expMs}.${hmacHex}`
 * HMAC = HMAC-SHA256(secret, `${address}.${expMs}`)
 */

export function signGameToken(address, secret, ttlMs = 5 * 60 * 1000) {
  const addr = address.toLowerCase();
  const exp = String(Date.now() + ttlMs);
  const payload = `${addr}.${exp}`;
  const hmac = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

export function verifyGameToken(token, secret) {
  if (typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [addr, expStr, hmac] = parts;
  if (!addr || !expStr || !hmac) return null;
  if (!/^0x[a-f0-9]{40}$/.test(addr)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const payload = `${addr}.${expStr}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    const a = Buffer.from(hmac, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return addr;
}
