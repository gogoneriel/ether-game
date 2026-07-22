/**
 * Authoritative duel room manager (M5).
 * Town rooms stay in server.mjs; this handles duel:* only.
 */
import { verifyGameToken } from './token.mjs';
import { buildGuild, buildHand } from './cards.mjs';
import {
  createDuel,
  applyAction,
  tickTimer,
  publicState,
  TURN_TIMER_SEC,
} from './duelEngine.mjs';
import { logMatchEnd } from './matchLog.mjs';

const ACTION_MIN_MS = 80;
const JOIN_MIN_MS = 200;
const DISCONNECT_FORFEIT_MS = 8_000;
const TICK_MS = 250;
/** Reject absurd card arrays before catalog work (HAND_SIZE is 3). */
const MAX_CARDS_ARRAY = 8;
const MAX_CARD_ID_LEN = 64;

/** @typedef {{ ws: import('ws').WebSocket, address: string, name: string, side: 'a'|'b'|null, lastAction: number, disconnectedAt?: number | null, hand?: unknown, guild?: unknown }} Seat */

/** @typedef {{
 *   id: string,
 *   state: ReturnType<typeof createDuel> | null,
 *   seats: { a: Seat | null, b: Seat | null },
 *   waiting: Seat | null,
 *   spectators: Map<string, Seat>,
 *   phase: 'waiting'|'ready'|'active'|'ended',
 *   startedAt?: number,
 *   actions?: Array<object>,
 *   matchLogged?: boolean,
 * }} DuelRoom */

/** @type {Map<string, DuelRoom>} */
const rooms = new Map();
/** address → roomId */
const byAddress = new Map();

let roomSeq = 1;

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function roomId() {
  return `duel-${roomSeq++}`;
}

function spectatorCount(room) {
  return room.spectators.size;
}

function broadcastState(room) {
  if (!room.state) return;
  const specs = spectatorCount(room);
  for (const side of ['a', 'b']) {
    const seat = room.seats[side];
    if (!seat?.ws) continue;
    send(seat.ws, {
      t: 'duel:state',
      roomId: room.id,
      youAre: side,
      spectators: specs,
      state: publicState(room.state, side),
    });
  }
  const specView = publicState(room.state, null);
  for (const seat of room.spectators.values()) {
    send(seat.ws, {
      t: 'duel:state',
      roomId: room.id,
      youAre: null,
      spectators: specs,
      state: specView,
    });
  }
}

function broadcastEnd(room) {
  if (!room.state) return;
  const payload = {
    t: 'duel:end',
    roomId: room.id,
    winner: room.state.winner,
    turns: room.state.turn,
    hp: {
      a: room.state.fighters.a.hp,
      b: room.state.fighters.b.hp,
    },
    names: {
      a: room.state.fighters.a.name,
      b: room.state.fighters.b.name,
    },
  };
  for (const side of ['a', 'b']) {
    const seat = room.seats[side];
    if (seat?.ws) send(seat.ws, payload);
  }
  for (const seat of room.spectators.values()) {
    send(seat.ws, payload);
  }
  void persistMatch(room);
}

function persistMatch(room) {
  if (!room?.state || room.matchLogged) return;
  room.matchLogged = true;
  const forfeit = Boolean(
    room.state.log?.some(
      (line) =>
        typeof line?.text === 'string' &&
        (line.text.includes('forfeit') || line.text.includes('disconnected')),
    ),
  );
  void logMatchEnd({
    roomId: room.id,
    state: room.state,
    forfeit,
    startedAt: room.startedAt,
    actions: room.actions || [],
  });
}

function startDuel(room) {
  const a = room.seats.a;
  const b = room.seats.b;
  if (!a || !b) return;
  room.state = createDuel(
    { address: a.address, name: a.name, hand: a.hand, guildCard: a.guild },
    { address: b.address, name: b.name, hand: b.hand, guildCard: b.guild },
  );
  room.phase = 'active';
  room.startedAt = Date.now();
  room.actions = [];
  room.matchLogged = false;
  for (const side of ['a', 'b']) {
    const seat = room.seats[side];
    send(seat.ws, {
      t: 'duel:start',
      roomId: room.id,
      youAre: side,
      timerSec: TURN_TIMER_SEC,
      spectators: spectatorCount(room),
      state: publicState(room.state, side),
    });
  }
  for (const seat of room.spectators.values()) {
    send(seat.ws, {
      t: 'duel:start',
      roomId: room.id,
      youAre: null,
      timerSec: TURN_TIMER_SEC,
      spectators: spectatorCount(room),
      state: publicState(room.state, null),
    });
  }
  console.log(`[duel] start ${room.id} a=${a.address} b=${b.address}`);
}

function cleanupRoom(room) {
  for (const side of ['a', 'b']) {
    const seat = room.seats[side];
    if (seat) byAddress.delete(seat.address);
  }
  if (room.waiting) byAddress.delete(room.waiting.address);
  for (const addr of room.spectators.keys()) byAddress.delete(addr);
  rooms.delete(room.id);
}

function findOpenWaitingRoom() {
  for (const room of rooms.values()) {
    if (room.phase === 'waiting' && room.waiting && !room.seats.a) {
      return room;
    }
  }
  return null;
}

function leaveRoom(address, reason = 'leave') {
  const roomIdKey = byAddress.get(address);
  if (!roomIdKey) return;
  const room = rooms.get(roomIdKey);
  if (!room) {
    byAddress.delete(address);
    return;
  }

  if (room.waiting?.address === address) {
    room.waiting = null;
    byAddress.delete(address);
    rooms.delete(room.id);
    return;
  }

  if (room.spectators.has(address)) {
    room.spectators.delete(address);
    byAddress.delete(address);
    broadcastState(room);
    return;
  }

  // Fighter disconnect
  for (const side of ['a', 'b']) {
    const seat = room.seats[side];
    if (seat?.address !== address) continue;
    seat.ws = null;
    byAddress.delete(address);

    if (room.phase === 'active' && room.state) {
      const winner = side === 'a' ? 'b' : 'a';
      room.state = {
        ...room.state,
        phase: 'ended',
        winner,
        log: [
          ...room.state.log,
          {
            text:
              reason === 'leave'
                ? `${seat.name} left — forfeit.`
                : `${seat.name} disconnected — forfeit (${reason}).`,
            ts: Date.now(),
          },
        ],
      };
      room.phase = 'ended';
      broadcastEnd(room);
      cleanupRoom(room);
      return;
    }

    room.seats[side] = null;
    if (!room.seats.a && !room.seats.b && room.spectators.size === 0) {
      cleanupRoom(room);
    }
    return;
  }
}

/**
 * Handle a duel:* message. Returns true if handled.
 * @param {import('ws').WebSocket} ws
 * @param {object} msg
 * @param {string} secret
 * @param {{ address?: string }} ctx  mutable per-connection duel identity
 */
export function handleDuelMessage(ws, msg, secret, ctx) {
  if (!msg?.t?.startsWith('duel:')) return false;

  if (msg.t === 'duel:join') {
    const nowJoin = Date.now();
    if (nowJoin - (ctx.lastJoin || 0) < JOIN_MIN_MS) {
      send(ws, { t: 'error', code: 'rate', message: 'slow down' });
      return true;
    }
    ctx.lastJoin = nowJoin;

    const address = verifyGameToken(msg.token, secret);
    if (!address) {
      send(ws, { t: 'error', code: 'auth', message: 'invalid token' });
      return true;
    }
    const name =
      typeof msg.name === 'string' && msg.name.trim().length >= 1
        ? msg.name.trim().slice(0, 24)
        : address.slice(0, 6);
    const wantSpectate = Boolean(msg.spectate);

    // M7: optional hand selection (ids only — stats resolved from the catalog).
    // Invalid / absent selection falls back to the demo hand + demo guild.
    let hand;
    let guild;
    if (Array.isArray(msg.cards)) {
      if (msg.cards.length > MAX_CARDS_ARRAY) {
        send(ws, {
          t: 'error',
          code: 'bad_hand',
          message: 'too many cards',
        });
        return true;
      }
      const idsOk = msg.cards.every(
        (id) => typeof id === 'string' && id.length > 0 && id.length <= MAX_CARD_ID_LEN,
      );
      if (!idsOk) {
        send(ws, { t: 'error', code: 'bad_hand', message: 'invalid card ids' });
        return true;
      }
      const built = buildHand(msg.cards);
      if (built) {
        hand = built;
        guild = buildGuild(typeof msg.guildId === 'string' ? msg.guildId : null);
      }
    }

    // Already in a room? Replace socket if same address (mid-duel reconnect).
    const existingId = byAddress.get(address);
    if (existingId) {
      const room = rooms.get(existingId);
      if (room) {
        for (const side of ['a', 'b']) {
          if (room.seats[side]?.address === address) {
            room.seats[side].ws = ws;
            room.seats[side].disconnectedAt = null;
            ctx.address = address;
            ctx.roomId = room.id;
            send(ws, {
              t: 'duel:start',
              roomId: room.id,
              youAre: side,
              timerSec: room.state?.timerSec ?? TURN_TIMER_SEC,
              spectators: spectatorCount(room),
              state: room.state ? publicState(room.state, side) : null,
            });
            return true;
          }
        }
        if (room.spectators.has(address)) {
          const spec = room.spectators.get(address);
          spec.ws = ws;
          spec.disconnectedAt = null;
          ctx.address = address;
          ctx.roomId = room.id;
          send(ws, {
            t: 'duel:start',
            roomId: room.id,
            youAre: null,
            spectators: spectatorCount(room),
            state: room.state ? publicState(room.state, null) : null,
          });
          return true;
        }
      }
      leaveRoom(address, 'rejoin');
    }

    ctx.address = address;

    // Spectate an active room, or force spectate
    if (wantSpectate) {
      let target = null;
      if (typeof msg.roomId === 'string' && rooms.has(msg.roomId)) {
        target = rooms.get(msg.roomId);
      } else {
        for (const r of rooms.values()) {
          if (r.phase === 'active' || r.phase === 'ready') {
            target = r;
            break;
          }
        }
      }
      if (!target || !target.state) {
        send(ws, { t: 'error', code: 'no_duel', message: 'no active duel to spectate' });
        return true;
      }
      const seat = { ws, address, name, side: null, lastAction: 0 };
      target.spectators.set(address, seat);
      byAddress.set(address, target.id);
      ctx.roomId = target.id;
      send(ws, {
        t: 'duel:start',
        roomId: target.id,
        youAre: null,
        spectators: spectatorCount(target),
        state: publicState(target.state, null),
      });
      broadcastState(target);
      return true;
    }

    // Matchmaking: join waiting seat, else spectate active duel, else create waiting
    let room = findOpenWaitingRoom();
    if (!room) {
      // Only overflow into a live duel (both fighters still connected).
      // Orphaned rooms during disconnect-grace must not block new matchmaking.
      let active = null;
      for (const r of rooms.values()) {
        if (
          (r.phase === 'active' || r.phase === 'ready') &&
          r.seats.a?.ws &&
          r.seats.b?.ws &&
          r.state
        ) {
          active = r;
          break;
        }
      }
      if (active) {
        const seat = { ws, address, name, side: null, lastAction: 0 };
        active.spectators.set(address, seat);
        byAddress.set(address, active.id);
        ctx.roomId = active.id;
        send(ws, {
          t: 'duel:start',
          roomId: active.id,
          youAre: null,
          spectators: spectatorCount(active),
          state: publicState(active.state, null),
        });
        broadcastState(active);
        console.log(`[duel] auto-spectate ${active.id} ${address}`);
        return true;
      }

      room = {
        id: roomId(),
        state: null,
        seats: { a: null, b: null },
        waiting: { ws, address, name, side: null, lastAction: 0, hand, guild },
        spectators: new Map(),
        phase: 'waiting',
      };
      rooms.set(room.id, room);
      byAddress.set(address, room.id);
      ctx.roomId = room.id;
      send(ws, {
        t: 'duel:waiting',
        roomId: room.id,
        message: 'Waiting for opponent…',
      });
      console.log(`[duel] waiting ${room.id} ${address}`);
      return true;
    }

    // Pair with waiter
    const waiter = room.waiting;
    room.waiting = null;
    room.seats.a = { ...waiter, side: 'a' };
    room.seats.b = { ws, address, name, side: 'b', lastAction: 0, hand, guild };
    room.phase = 'ready';
    byAddress.set(address, room.id);
    ctx.roomId = room.id;
    startDuel(room);
    return true;
  }

  if (msg.t === 'duel:ready') {
    // Optional handshake — duel starts automatically when 2 join.
    send(ws, { t: 'duel:ack', message: 'ready noted' });
    return true;
  }

  if (msg.t === 'duel:action') {
    const address = ctx.address;
    if (!address) {
      send(ws, { t: 'error', code: 'auth', message: 'duel:join first' });
      return true;
    }
    const room = rooms.get(ctx.roomId || byAddress.get(address));
    if (!room || !room.state || room.phase !== 'active') {
      send(ws, { t: 'error', code: 'no_duel', message: 'no active duel' });
      return true;
    }

    let side = null;
    if (room.seats.a?.address === address) side = 'a';
    else if (room.seats.b?.address === address) side = 'b';
    if (!side) {
      send(ws, { t: 'error', code: 'spectator', message: 'spectators cannot act' });
      return true;
    }

    const seat = room.seats[side];
    const now = Date.now();
    if (now - seat.lastAction < ACTION_MIN_MS) {
      send(ws, { t: 'error', code: 'rate', message: 'slow down' });
      return true;
    }

    // Ignore forged hp / damage fields — only action + cardId matter
    const result = applyAction(room.state, side, {
      action: msg.action,
      cardId: typeof msg.cardId === 'string' ? msg.cardId : undefined,
    });

    if (!result.ok) {
      send(ws, { t: 'error', code: result.error, message: result.error });
      return true;
    }

    seat.lastAction = now;
    room.state = result.state;
    if (!room.actions) room.actions = [];
    room.actions.push({
      side,
      action: msg.action,
      cardId: typeof msg.cardId === 'string' ? msg.cardId : null,
      turn: result.state.turn,
      ts: now,
    });
    broadcastState(room);

    if (room.state.phase === 'ended') {
      room.phase = 'ended';
      broadcastEnd(room);
      cleanupRoom(room);
    }
    return true;
  }

  if (msg.t === 'duel:leave') {
    if (ctx.address) leaveRoom(ctx.address, 'leave');
    ctx.address = undefined;
    ctx.roomId = undefined;
    send(ws, { t: 'duel:left' });
    return true;
  }

  send(ws, { t: 'error', code: 'unknown', message: `unknown ${msg.t}` });
  return true;
}

export function onDuelSocketClose(ctx) {
  if (!ctx?.address) return;
  const roomIdKey = byAddress.get(ctx.address);
  const room = roomIdKey ? rooms.get(roomIdKey) : null;
  if (!room) {
    byAddress.delete(ctx.address);
    return;
  }

  // Spectators leave immediately
  if (room.spectators.has(ctx.address)) {
    leaveRoom(ctx.address, 'disconnect');
    return;
  }

  // Waiting solo — cancel room
  if (room.waiting?.address === ctx.address) {
    leaveRoom(ctx.address, 'disconnect');
    return;
  }

  // Fighter: short grace then forfeit (handled by tick via null ws)
  for (const side of ['a', 'b']) {
    if (room.seats[side]?.address === ctx.address) {
      room.seats[side].ws = null;
      room.seats[side].disconnectedAt = Date.now();
    }
  }
}

/** 250ms tick: timers + disconnect forfeits */
export function tickDuels() {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    if (room.phase !== 'active' || !room.state) continue;

    // Disconnect forfeit
    for (const side of ['a', 'b']) {
      const seat = room.seats[side];
      if (
        seat &&
        !seat.ws &&
        seat.disconnectedAt &&
        now - seat.disconnectedAt > DISCONNECT_FORFEIT_MS
      ) {
        leaveRoom(seat.address, 'timeout');
        break;
      }
    }
    if (!rooms.has(room.id)) continue;

    const dt = TICK_MS / 1000;
    const actingSide = room.state.activeSide;
    const result = tickTimer(room.state, dt);
    const prevTimer = Math.ceil(room.state.timerSec);
    room.state = result.state;
    const nextTimer = Math.ceil(room.state.timerSec);

    if (result.timedOut) {
      if (!room.actions) room.actions = [];
      room.actions.push({
        side: actingSide,
        action: 'defend',
        cardId: null,
        turn: room.state.turn,
        ts: now,
        auto: true,
      });
    }
    if (result.timedOut || prevTimer !== nextTimer) {
      broadcastState(room);
    }
    if (room.state.phase === 'ended') {
      room.phase = 'ended';
      broadcastEnd(room);
      cleanupRoom(room);
    }
  }
}

export function duelRoomCount() {
  return rooms.size;
}

export function startDuelTicker() {
  return setInterval(tickDuels, TICK_MS);
}
