import http from 'node:http';
import { WebSocketServer } from 'ws';
import { verifyGameToken } from './token.mjs';

const PORT = Number(process.env.PORT || 8080);
const SECRET = process.env.GAME_WS_SECRET || '';
const LANGS = new Set(['en', 'pt', 'es', 'de', 'fr']);
const MAPS = new Set(['town', 'forest']);
const SNAP_HZ = 10;
const SNAP_MS = Math.floor(1000 / SNAP_HZ);
const DISCONNECT_GRACE_MS = 10_000;
const PING_MS = 15_000;
const MAX_CHAT_LEN = 200;
const CHAT_COOLDOWN_MS = 1000;
const MOVE_MIN_MS = 90;
const WORLD_MIN = 0;
const WORLD_MAX = 8192;

if (!SECRET) {
  console.warn('[liber-game] WARNING: GAME_WS_SECRET is empty — join will fail');
}

/** @typedef {{ address: string, name: string, sheetKey: string, map: string, x: number, y: number, facing: string, ws: import('ws').WebSocket | null, lastInput: number, lastChat: number, disconnectedAt: number | null, lang: string }} Player */

/** @type {Map<string, Map<string, Player>>} */
const rooms = new Map();

function roomKey(lang) {
  return `town-${lang}`;
}

function getRoom(lang) {
  const key = roomKey(lang);
  let room = rooms.get(key);
  if (!room) {
    room = new Map();
    rooms.set(key, room);
  }
  return room;
}

function normalizeLang(lang) {
  const l = String(lang || 'en').toLowerCase().slice(0, 2);
  return LANGS.has(l) ? l : 'en';
}

function normalizeMap(map) {
  return MAPS.has(map) ? map : 'town';
}

function normalizeFacing(f) {
  return f === 'up' || f === 'left' || f === 'right' || f === 'down' ? f : 'down';
}

function clampCoord(n, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(WORLD_MAX, Math.max(WORLD_MIN, n));
}

/** Count players with an active socket (exclude disconnect-grace ghosts). */
function connectedCount(room) {
  let n = 0;
  for (const p of room.values()) {
    if (!p.disconnectedAt && p.ws && p.ws.readyState === 1) n += 1;
  }
  return n;
}

function totalConnected() {
  let n = 0;
  for (const room of rooms.values()) n += connectedCount(room);
  return n;
}

function send(ws, msg) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

function rosterEntry(p) {
  return {
    address: p.address,
    displayName: p.name,
    sheetKey: p.sheetKey,
    map: p.map,
    x: p.x,
    y: p.y,
    facing: p.facing,
  };
}

function broadcast(room, msg, exceptAddress) {
  const raw = JSON.stringify(msg);
  for (const p of room.values()) {
    if (exceptAddress && p.address === exceptAddress) continue;
    if (p.ws && p.ws.readyState === 1) p.ws.send(raw);
  }
}

function removePlayer(room, address, reason) {
  const p = room.get(address);
  if (!p) return;
  room.delete(address);
  broadcast(room, { t: 'leave', address, reason: reason || 'leave' });
  console.log(
    `[liber-game] leave ${address} (${reason || 'leave'}) room=${roomKey(p.lang)} connected=${connectedCount(room)}`,
  );
}

function kickOldSocket(player, reason) {
  if (player.ws && player.ws.readyState === 1) {
    send(player.ws, { t: 'error', code: 'kicked', message: reason });
    try {
      player.ws.close(4000, reason);
    } catch {
      /* ignore */
    }
  }
  player.ws = null;
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        online: totalConnected(),
        rooms: rooms.size,
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  /** @type {Player | null} */
  let me = null;
  let alive = true;

  ws.on('pong', () => {
    alive = true;
  });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;

    if (msg.t === 'join') {
      const address = verifyGameToken(msg.token, SECRET);
      if (!address) {
        send(ws, { t: 'error', code: 'auth', message: 'invalid token' });
        ws.close(4001, 'auth');
        return;
      }
      const lang = normalizeLang(msg.lang);
      const room = getRoom(lang);
      const name =
        typeof msg.name === 'string' && msg.name.trim().length >= 1
          ? msg.name.trim().slice(0, 24)
          : address.slice(0, 6);
      const sheetKey =
        typeof msg.sheetKey === 'string' && msg.sheetKey
          ? msg.sheetKey.slice(0, 64)
          : 'player-base';
      const map = normalizeMap(msg.map);
      const x = clampCoord(Number(msg.x), 928);
      const y = clampCoord(Number(msg.y), 608);
      const facing = normalizeFacing(msg.facing);

      const existing = room.get(address);
      if (existing) {
        const withinGrace =
          existing.disconnectedAt != null &&
          Date.now() - existing.disconnectedAt < DISCONNECT_GRACE_MS;
        kickOldSocket(existing, 'replaced');
        existing.ws = ws;
        existing.name = name;
        existing.sheetKey = sheetKey;
        existing.map = map;
        existing.facing = facing;
        existing.disconnectedAt = null;
        existing.lastInput = Date.now();
        // Within grace: keep server-stored position (mobile blip).
        // Outside grace / tab replace: accept client coords.
        if (!withinGrace && Number.isFinite(msg.x) && Number.isFinite(msg.y)) {
          existing.x = x;
          existing.y = y;
        }
        me = existing;
      } else {
        me = {
          address,
          name,
          sheetKey,
          map,
          x,
          y,
          facing,
          ws,
          lastInput: Date.now(),
          lastChat: 0,
          disconnectedAt: null,
          lang,
        };
        room.set(address, me);
        broadcast(room, { t: 'join', player: rosterEntry(me) }, address);
      }

      const roster = [];
      for (const p of room.values()) {
        if (p.address === address) continue;
        if (p.disconnectedAt) continue;
        roster.push(rosterEntry(p));
      }
      send(ws, {
        t: 'welcome',
        selfId: address,
        lang,
        online: connectedCount(room),
        roster,
      });
      console.log(
        `[liber-game] join ${address} lang=${lang} connected=${connectedCount(room)}`,
      );
      return;
    }

    if (!me) {
      send(ws, { t: 'error', code: 'auth', message: 'join first' });
      return;
    }

    const room = getRoom(me.lang);

    if (msg.t === 'move') {
      const now = Date.now();
      if (now - me.lastInput < MOVE_MIN_MS) return;
      me.lastInput = now;
      if (Number.isFinite(msg.x)) me.x = clampCoord(Number(msg.x), me.x);
      if (Number.isFinite(msg.y)) me.y = clampCoord(Number(msg.y), me.y);
      me.facing = normalizeFacing(msg.facing);
      if (typeof msg.map === 'string') me.map = normalizeMap(msg.map);
      if (typeof msg.sheetKey === 'string' && msg.sheetKey) {
        me.sheetKey = msg.sheetKey.slice(0, 64);
      }
      if (typeof msg.name === 'string' && msg.name.trim().length >= 2) {
        me.name = msg.name.trim().slice(0, 24);
      }
      me.disconnectedAt = null;
      return;
    }

    if (msg.t === 'chat') {
      const now = Date.now();
      if (now - me.lastChat < CHAT_COOLDOWN_MS) return;
      const text =
        typeof msg.text === 'string' ? msg.text.trim().slice(0, MAX_CHAT_LEN) : '';
      if (!text) return;
      me.lastChat = now;
      broadcast(room, {
        t: 'chat',
        address: me.address,
        displayName: me.name,
        text,
        ts: now,
      });
      return;
    }

    if (msg.t === 'switch') {
      const nextLang = normalizeLang(msg.lang);
      if (nextLang === me.lang) return;
      const oldRoom = getRoom(me.lang);
      removePlayer(oldRoom, me.address, 'switch');
      me.lang = nextLang;
      me.ws = ws;
      me.disconnectedAt = null;
      const nextRoom = getRoom(nextLang);
      const stale = nextRoom.get(me.address);
      if (stale && stale !== me) kickOldSocket(stale, 'replaced');
      nextRoom.set(me.address, me);
      broadcast(nextRoom, { t: 'join', player: rosterEntry(me) }, me.address);
      const roster = [];
      for (const p of nextRoom.values()) {
        if (p.address === me.address) continue;
        if (p.disconnectedAt) continue;
        roster.push(rosterEntry(p));
      }
      send(ws, {
        t: 'welcome',
        selfId: me.address,
        lang: nextLang,
        online: connectedCount(nextRoom),
        roster,
      });
      return;
    }

    if (msg.t === 'identity') {
      if (typeof msg.name === 'string' && msg.name.trim().length >= 2) {
        me.name = msg.name.trim().slice(0, 24);
      }
      if (typeof msg.sheetKey === 'string' && msg.sheetKey) {
        me.sheetKey = msg.sheetKey.slice(0, 64);
      }
    }
  });

  ws.on('close', () => {
    if (!me) return;
    // Only mark grace if this socket is still the active one (not a kick).
    if (me.ws === ws) {
      me.ws = null;
      me.disconnectedAt = Date.now();
    }
  });

  ws.on('error', () => {
    /* close handler cleans up */
  });

  const pingTimer = setInterval(() => {
    if (!alive) {
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
      clearInterval(pingTimer);
      return;
    }
    alive = false;
    try {
      ws.ping();
    } catch {
      clearInterval(pingTimer);
    }
  }, PING_MS);

  ws.on('close', () => clearInterval(pingTimer));
});

// 10Hz snapshots per room (map-scoped for each recipient)
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    for (const [addr, p] of room) {
      if (p.disconnectedAt && now - p.disconnectedAt > DISCONNECT_GRACE_MS) {
        removePlayer(room, addr, 'timeout');
      }
    }
    if (room.size === 0) continue;

    /** @type {Map<string, ReturnType<typeof rosterEntry>[]>} */
    const byMap = new Map();
    for (const p of room.values()) {
      if (p.disconnectedAt) continue;
      let list = byMap.get(p.map);
      if (!list) {
        list = [];
        byMap.set(p.map, list);
      }
      list.push(rosterEntry(p));
    }

    const online = connectedCount(room);
    for (const p of room.values()) {
      if (!p.ws || p.ws.readyState !== 1) continue;
      const players = (byMap.get(p.map) || []).filter(
        (e) => e.address !== p.address,
      );
      send(p.ws, { t: 'snap', ts: now, online, players });
    }
  }
}, SNAP_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[liber-game] listening on :${PORT} path=/ws health=/healthz`);
});
