/**
 * Integration suite against a running liber-game server.
 * Usage: GAME_WS_SECRET=dev node scripts/verify-game-server.mjs [ws://127.0.0.1:8080/ws]
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../server/package.json'),
);
const { WebSocket } = require('ws');

const URL = process.argv[2] || 'ws://127.0.0.1:8080/ws';
const SECRET = process.env.GAME_WS_SECRET || 'dev-test-secret';

function sign(address, ttlMs = 60_000) {
  const addr = address.toLowerCase();
  const exp = String(Date.now() + ttlMs);
  const payload = `${addr}.${exp}`;
  const hmac = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function once(ws, type, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for ${type}`)),
      timeoutMs,
    );
    const onMsg = (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.t === type) {
        clearTimeout(timer);
        ws.off('message', onMsg);
        resolve(msg);
      }
    };
    ws.on('message', onMsg);
  });
}

function connect(address, name, lang = 'en', x = 900, y = 600) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          t: 'join',
          token: sign(address),
          name,
          sheetKey: 'player-base',
          map: 'town',
          lang,
          x,
          y,
          facing: 'down',
        }),
      );
    });
    ws.on('error', reject);
    once(ws, 'welcome')
      .then((welcome) => resolve({ ws, welcome }))
      .catch(reject);
  });
}

function waitAuthReject(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const timer = setTimeout(() => reject(new Error('auth reject timeout')), 5000);
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          t: 'join',
          token,
          name: 'Bad',
          sheetKey: 'player-base',
          map: 'town',
          lang: 'en',
          x: 0,
          y: 0,
          facing: 'down',
        }),
      );
    });
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.t === 'error' && msg.code === 'auth') {
        clearTimeout(timer);
        ws.close();
        resolve(msg);
      }
    });
    ws.on('close', (code) => {
      if (code === 4001) {
        clearTimeout(timer);
        resolve({ t: 'error', code: 'auth' });
      }
    });
    ws.on('error', () => {
      /* may fire on close */
    });
  });
}

const addrA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const addrB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const addrC = '0xcccccccccccccccccccccccccccccccccccccccc';

// --- Auth rejects ---
await waitAuthReject('not.a.token');
console.log('Auth: invalid token rejected');

const expired = (() => {
  const addr = addrA;
  const exp = String(Date.now() - 1000);
  const payload = `${addr}.${exp}`;
  const hmac = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
})();
await waitAuthReject(expired);
console.log('Auth: expired token rejected');

const good = sign(addrA);
const tampered = good.slice(0, -4) + 'dead';
await waitAuthReject(tampered);
console.log('Auth: tampered HMAC rejected');

// --- Happy path ---
const a = await connect(addrA, 'Alice', 'en', 900, 600);
assert.equal(a.welcome.selfId, addrA);
console.log('A welcomed, online=', a.welcome.online);

const b = await connect(addrB, 'Bob', 'en', 910, 610);
assert.ok(
  b.welcome.roster.some((p) => p.address === addrA),
  'B should see A in roster',
);
console.log('B welcomed, roster has A');

await once(a.ws, 'join', 3000).catch(() => null);

b.ws.send(
  JSON.stringify({ t: 'move', x: 950, y: 620, facing: 'right', map: 'town' }),
);

let bobInSnap = null;
for (let i = 0; i < 20; i++) {
  const snap = await once(a.ws, 'snap', 3000);
  bobInSnap = (snap.players || []).find((p) => p.address === addrB);
  if (bobInSnap && Math.abs(bobInSnap.x - 950) < 1) break;
  bobInSnap = null;
}
assert.ok(bobInSnap, 'A receives B in snap at moved x');
console.log('Snapshot relay OK');

// Chat: sender also receives (documents why client filters)
const chatOnB = once(b.ws, 'chat', 3000);
b.ws.send(JSON.stringify({ t: 'chat', text: 'hello plaza' }));
const chatSelf = await chatOnB;
assert.equal(chatSelf.text, 'hello plaza');
assert.equal(chatSelf.address, addrB);
console.log('Chat echo to sender OK (client filters)');

await new Promise((r) => setTimeout(r, 1100)); // chat cooldown
const chatOnA = once(a.ws, 'chat', 3000);
b.ws.send(JSON.stringify({ t: 'chat', text: 'second msg' }));
const chatPeer = await chatOnA;
assert.equal(chatPeer.text, 'second msg');
console.log('Chat relay to peer OK');

// Map isolation: B leaves town -> A snaps exclude B
b.ws.send(
  JSON.stringify({ t: 'move', x: 100, y: 100, facing: 'up', map: 'forest' }),
);
let gone = false;
for (let i = 0; i < 20; i++) {
  const snap = await once(a.ws, 'snap', 3000);
  const still = (snap.players || []).find((p) => p.address === addrB);
  if (!still) {
    gone = true;
    break;
  }
}
assert.ok(gone, 'B not in town snaps after forest move');
console.log('Map isolation OK');

// Room isolation: C in pt, invisible to en
const c = await connect(addrC, 'Carla', 'pt', 800, 800);
let sawC = false;
for (let i = 0; i < 8; i++) {
  const snap = await once(a.ws, 'snap', 2000).catch(() => null);
  if (!snap) break;
  if ((snap.players || []).some((p) => p.address === addrC)) {
    sawC = true;
    break;
  }
}
assert.equal(sawC, false, 'pt player must not appear in en snaps');
console.log('Room isolation OK');
c.ws.close();

// Kick: second connection for same address
const a2 = await connect(addrA, 'Alice2', 'en', 920, 620);
const kicked = await once(a.ws, 'error', 5000).catch(() => null);
assert.ok(
  kicked?.code === 'kicked' || a.ws.readyState !== WebSocket.OPEN,
  'first socket kicked or closed',
);
console.log('Duplicate address kick OK');
a2.ws.close();

// Reconnect within grace keeps server position
const dAddr = '0xdddddddddddddddddddddddddddddddddddddddd';
const observer = await connect(
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'Eve',
  'en',
  500,
  500,
);
const d1 = await connect(dAddr, 'Dana', 'en', 1000, 1000);
await new Promise((r) => setTimeout(r, 120)); // clear MOVE_MIN_MS
d1.ws.send(
  JSON.stringify({ t: 'move', x: 1111, y: 1222, facing: 'left', map: 'town' }),
);

let danaMoved = null;
for (let i = 0; i < 25; i++) {
  const snap = await once(observer.ws, 'snap', 3000);
  danaMoved = (snap.players || []).find((p) => p.address === dAddr);
  if (danaMoved && Math.abs(danaMoved.x - 1111) < 1) break;
  danaMoved = null;
}
assert.ok(danaMoved, 'observer saw Dana move before disconnect');

d1.ws.close();
await new Promise((r) => setTimeout(r, 300)); // still within 10s grace

// Dana reconnects with wrong join coords — server should keep 1111,1222
const d2 = await connect(dAddr, 'Dana', 'en', 1, 1);
let danaPos = null;
for (let i = 0; i < 25; i++) {
  const snap = await once(observer.ws, 'snap', 3000);
  danaPos = (snap.players || []).find((p) => p.address === dAddr);
  if (danaPos && Math.abs(danaPos.x - 1111) < 1) break;
  danaPos = null;
}
assert.ok(danaPos, 'observer sees Dana after reconnect');
assert.ok(
  Math.abs(danaPos.x - 1111) < 1 && Math.abs(danaPos.y - 1222) < 1,
  `grace reconnect kept server pos, got ${danaPos.x},${danaPos.y}`,
);
console.log('Grace reconnect position OK');

d2.ws.close();
observer.ws.close();
b.ws.close();

console.log('PASS verify-game-server');
process.exit(0);
