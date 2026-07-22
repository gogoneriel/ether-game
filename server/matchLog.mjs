/**
 * Best-effort PvP match telemetry → Supabase `game_matches`.
 * Uses REST insert so the game server stays dependency-light.
 * Failures are logged and never break duel flow.
 */

const TABLE = 'game_matches';

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return { url, key };
}

/**
 * @param {{
 *   roomId: string,
 *   state: object,
 *   forfeit?: boolean,
 *   startedAt?: number,
 *   actions?: Array<object>,
 * }} payload
 */
export async function logMatchEnd(payload) {
  const cfg = supabaseConfig();
  if (!cfg) return { ok: false, skipped: true, reason: 'supabase_not_configured' };

  const state = payload.state;
  if (!state?.fighters?.a || !state?.fighters?.b) {
    return { ok: false, skipped: true, reason: 'bad_state' };
  }

  const a = state.fighters.a;
  const b = state.fighters.b;
  const startedAt = payload.startedAt || Date.now();
  const durationSec = Math.max(
    0,
    Math.round((Date.now() - startedAt) / 1000),
  );

  const winnerSide = state.winner === 'a' || state.winner === 'b' ? state.winner : null;
  const winnerAddress =
    winnerSide === 'a' ? a.address : winnerSide === 'b' ? b.address : null;

  const row = {
    room_id: String(payload.roomId || '').slice(0, 64),
    player_a: String(a.address || '').toLowerCase(),
    player_b: String(b.address || '').toLowerCase(),
    name_a: String(a.name || '').slice(0, 48),
    name_b: String(b.name || '').slice(0, 48),
    winner_side: winnerSide,
    winner_address: winnerAddress,
    turns: Number(state.turn) || 0,
    duration_sec: durationSec,
    forfeit: Boolean(payload.forfeit),
    hp_a: Number(a.hp) || 0,
    hp_b: Number(b.hp) || 0,
    max_hp_a: Number(a.maxHp) || 0,
    max_hp_b: Number(b.maxHp) || 0,
    damage_a: Math.max(0, (Number(a.maxHp) || 0) - (Number(a.hp) || 0)),
    damage_b: Math.max(0, (Number(b.maxHp) || 0) - (Number(b.hp) || 0)),
    hand_a: (a.hand || []).map((c) => ({
      id: c.id,
      name: c.name,
      atk: c.atk,
      def: c.def,
      sp: c.sp,
      element: c.element,
      rarity: c.rarity,
    })),
    hand_b: (b.hand || []).map((c) => ({
      id: c.id,
      name: c.name,
      atk: c.atk,
      def: c.def,
      sp: c.sp,
      element: c.element,
      rarity: c.rarity,
    })),
    guild_a: a.guildCard
      ? { id: a.guildCard.id, name: a.guildCard.name }
      : null,
    guild_b: b.guildCard
      ? { id: b.guildCard.id, name: b.guildCard.name }
      : null,
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 200) : [],
    log_tail: Array.isArray(state.log)
      ? state.log.slice(-12).map((l) => ({ text: l.text, ts: l.ts }))
      : [],
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[matchLog] insert failed', res.status, text.slice(0, 300));
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[matchLog] insert error', err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}
