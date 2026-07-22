import { timingSafeEqual } from 'node:crypto';

export function requireAgentSecret(req, res) {
  const expected = (process.env.AGENT_SECRET || '').trim();
  if (!expected) {
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'AGENT_SECRET_not_configured' }));
    return false;
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : (req.headers['x-agent-secret'] || '').toString().trim();

  if (!token || token.length !== expected.length) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return false;
  }

  const ok = timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return false;
  }
  return true;
}
