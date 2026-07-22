# Hermes Game Architect — knowledge pack
Generated: 2026-07-22T23:54:59.033Z
Liber root: c:\Users\gogon\Documents\code\Liberview
# Target image briefs (visual north star)

## Image A — Prototype (current-ish)
Mobile PvP: "Live PvP • Magnolia Arena", timer, spectators. Dual HP bars. Simple yellow/green cards in blue oval arena. Bottom hand with Sprout Runner / Reserve Keeper. Buttons ATTACK / DEFEND / SPECIAL. Dark purple→orange gradient. Functional prototype, not final art.

## Image B — Mid fidelity HD-2D
Sunset arena, fantasy city with domes, glowing green runes on stone circle. Winged gold warrior vs green hooded rogue. Ornate gold-bordered wooden tray. Cards with ATK/DEF/SP color boxes. Log: "neriel played Defend +4". CRT-ish pixel lighting.

## Image C — High fidelity mock (cards in tray)
PvP Duel • Magnolia Arena. Libertador vs EtherKnight. Vault Phoenix (winged) vs Sprout Runner. Active card Frost Slash with ice VFX. Bottom tray: Sunflare Drake / Aqua Sentinel / Forest Guardian with elemental borders, ATK DEF SP + stars. Legendary Unicorns special slot. Deck backs. Spectators: 6.

## Image D — High fidelity with action buttons
Same arena fantasy. Large gold-filigree ATTACK (red/sword) DEFEND (blue/shield) SPECIAL (green/star) buttons above hand. Cards Sunflare Drake + Aqua Sentinel. Scroll prompt "Your turn — Choose: Attack • Defend • Special".

## Gap vs current build
Need: cinematic arena backdrop, character battle sprites (not placeholder cards-only), ornate UI tray, icon buttons, elemental card frames, particle VFX for plays, spectator/timer chrome polish, remove prototype blockiness.

## Skill: game-content-systems (condensed)

Dialogue as TS modules under src/game/dialogue/. Pause town input during dialogue.
Audio under public/game/audio/; mute via EventBus audio:mute + localStorage liber-game-mute.
Game feel: interact pulse, map fade 200–400ms, NPC bounce. No heavy post-FX; pixelArt true.
Chat is React overlay (not Phaser input). Sanitize, max 200 chars, rate-limit.

## Skill: hd2d-phaser-fx (condensed)

HD-2D: Light2D + normal maps, bloom/tilt-shift/vignette optional, day-night, drop shadows, particles, parallax clouds. Quality tiers high/lite. Prefer under src/game/fx or WorldScene lighting.

## Skill: pixel-art-pipeline (condensed)

CC0/LPC workflow: Kenney + OpenGameArt, Universal LPC sheets, atlas packing, CREDITS.md licenses. Card art and arena characters follow same pipeline.

## Guild design

Path: `docs/ether-game/guilds.md`

```
# Ether Game — DeFi Guild Cards (design)

Status: **design only** — not implemented onchain yet. Open for community debate.

## Goals

- Nine guilds inspired by major DeFi projects, each with a unique **guild NFT card**.
- Cards are **much stronger** than common Liber cards and limited to **one guild card per match**.
- **SLETH is neutral** — it is never a guild token. It is the universal mint base fee.
- Mint cost scales with a **tier (1×–10×)** paid in the guild’s own token; higher tiers unlock stronger signature stats.

## Mint formula

```
mint_cost = 1 SLETH  +  (tier × value_of_1_SLETH) in GUILD_TOKEN
tier ∈ {1, 2, …, 10}
```

- **Tier 1**: minimum — 1 SLETH + ~1 SLETH-equivalent of the guild token.
- **Tier 10**: maximum — 1 SLETH + ~10 SLETH-equivalent of the guild token.
- For each tier step above 1, the card’s **signature attribute** gains **+10%** (tier 10 ≈ +90% vs base).

Exact SLETH↔token equivalence (oracle vs fixed ratio) is an open question below.

## Match rule

A player may equip **at most one guild card** for a given match / session. Common (bronze/silver/gold) cards are unaffected by this rule.

## Chosen guild names (defaults)

| Project | Token | **Guild name** |
|---------|-------|----------------|
| Uniswap | UNI | **Legendary Unicorns** |
| EtherFi | ETHFI | **Ether Wardens** |
| Aave | AAVE | **Phantom Court** |
| Liquity | LQTY | **Tidecallers** |
| Synthetix | SNX | **Spartan Synths** |
| TrueFi | TRU | **The Trueborn** |
| Over | OVER | **Horizon Keepers** |
| Arbitrum | ARB | **Nitro Knights** |
| Rocket Pool | RPL | **The Rocketeers** |

### Name shortlist (alternatives)

- **Uniswap (UNI)**: Legendary Unicorns · The Hornguard · Unicorn Vanguard
- **EtherFi (ETHFI)**: Ether Wardens · The Restaked Order · Boundless Vault
- **Aave (AAVE)**: Phantom Court · Ghostlight Covenant · The Spectral Lenders
- **Liquity (LQTY)**: Tidecallers · The Liquid Legion · Zero-Fee Corsairs
- **Synthetix (SNX)**: Spartan Synths · The Synthforged · Oracle Spartans
- **TrueFi (TRU)**: The Trueborn · Oathkeepers · Creed of Trust
- **Over (OVER)**: Horizon Keepers · The Overworld Pioneers · Overlight Order
- **Arbitrum (ARB)**: Nitro Knights · Odyssey Vanguard · Nova Sentinels
- **Rocket Pool (RPL)**: The Rocketeers · Launch Brigade · Astral Poolers

## Suggested signature attributes (draft)

| Guild token | Signature attr (draft) | Flavor |
|-------------|------------------------|--------|
| UNI | MAGIA | Swaps / liquidity magic |
| ETHFI | DEF | Restake / shield |
| AAVE | DEF | Lending reserves |
| LQTY | ATK | Liquidation pressure |
| SNX | MAGIA | Synthetic oracle power |
| TRU | DEF | Credit / trust |
| OVER | ATK | Expansion / frontier |
| ARB | ATK | Nitro speed |
| RPL | MAGIA | Staking constellation |

## Open questions

1. **Price equivalence** — Chainlink (or similar) oracle vs a governance-fixed SLETH:token ratio refreshed periodically?
2. **Stake vs burn** — Are guild tokens locked in the NFT (refundable on burn/unmint) or burned / sent to a guild treasury?
3. **Tier upgrades** — Can a holder pay the difference to raise tier later, or is mint tier final?
4. **One-per-guild ownership** — Max one guild NFT per address per guild, or unlimited copies with tier variance?
5. **Battle timing** — Guild cards are design-complete before a battle mode exists; which attributes matter first for PvE vs PvP?
6. **Chain** — Arbitrum (where SLETH lives) with bridged guild tokens; which addresses are canonical?

## Out of scope (for now)

- Smart contract deployment
- Battle / deck gameplay loop
- LiberWallet mint UI wiring

## Related

- Common card economy (1 SLETH mint, rarity odds) remains separate and **neutral**.
- This document lives in the public Ether Game repo so the community can iterate before LiberWallet ships an adapter.

```

## Tale of Liber agent notes

Path: `docs/tale-of-liber-agent.md`

```
# Ether Game agent — Cursor setup

Specialized agent + skills for building Ether Game (Tale-of-Thales-style multiplayer Phaser) on LiberWallet governance.

## Invoke the agent

- Custom agent file: [`.cursor/agents/liber-game-dev.md`](../.cursor/agents/liber-game-dev.md)
- In Cursor Agent / chat, pick or `@` the **liber-game-dev** custom agent when working on the game
- Or attach skills manually:
  - `.cursor/skills/liberwallet-architecture/SKILL.md`
  - `.cursor/skills/phaser-in-nextjs/SKILL.md`
  - `.cursor/skills/game-multiplayer-supabase/SKILL.md`
  - `.cursor/skills/pixel-art-pipeline/SKILL.md`
  - `.cursor/skills/tiled-phaser-maps/SKILL.md`
  - `.cursor/skills/game-content-systems/SKILL.md`

Glob rule (auto when editing game paths): [`.cursor/rules/game-dev.mdc`](../.cursor/rules/game-dev.mdc)

## Docs to index in Cursor

**Settings → Indexing & Docs → Add Doc** (then use `@Docs` in chat):

| Doc | URL |
|-----|-----|
| Tale of Thales (design source) | https://docs.thalesmarket.io/tale-of-thales |
| Phaser 3 | https://docs.phaser.io |
| Tiled | https://doc.mapeditor.org |
| Supabase Realtime | https://supabase.com/docs/guides/realtime |
| Privy | https://docs.privy.io |
| Alchemy Smart Wallets | https://www.alchemy.com/docs/wallets |

Offline design summary (no network needed): [`.cursor/skills/phaser-in-nextjs/tot-design-reference.md`](../.cursor/skills/phaser-in-nextjs/tot-design-reference.md)

## External tools (install when building the game)

| Tool | Why |
|------|-----|
| [Tiled](https://www.mapeditor.org/) | Author town/forest maps → `public/game/maps/` |
| [Kenney](https://kenney.nl/) / LPC / itch.io CC0 | Replace generated art (same sheet layout) |
| `npm run generate:game-assets` | Regenerate 64px HD-2D tiles/sprites/normals/FX/maps/audio |
| HD-2D skill | `.cursor/skills/hd2d-phaser-fx/SKILL.md` — Light2D, Post FX, quality tiers |
| ethskills (`standards`, `addresses`, `frontend-ux`) | NFT gear / onchain UX — never invent addresses |

## MCP already available

- `plugin-supabase-supabase` — migrations, SQL, advisors
- `cursor-ide-browser` — in-IDE playtesting
- `user-headroom` — compress large tool outputs

## Play without account (recommended)

Open **`/ether-game`** (alias of `/tale-of-liber`) — no Privy, no dashboard. A guest cookie identity is created; town play works; onchain mint stays off until LiberWallet is linked (migrate later).

Optional local fake **team** wallet (Jarvis) — development only, never on Vercel:

```bash
# .env.local
NEXT_PUBLIC_GAME_DEV_BYPASS=true
GAME_DEV_WALLET=0x0000000000000000000000000000000000000001
NEXT_PUBLIC_GAME_DEV_WALLET=0x0000000000000000000000000000000000000001
```

Then `npm run dev` → **http://localhost:3002/ether-game** (or `/tale-of-liber` / `/dev-game`).

## Card economy (locked)

- Mint cost: **exactly 1 SLETH** (hard cap)
- Odds: **60% bronze / 30% silver / 10% gold**
- Split: 10% SLETH → treasury, 90% locked in NFT; unmint refunds 0.9 SLETH
- Contract: `contracts/game/LiberCards.sol` (Foundry tests pass)
- Deploy: `forge script script/DeployLiberCards.s.sol:DeployLiberCards --rpc-url $ARBITRUM_RPC_URL --broadcast`

## Architecture

```
/dashboard/governance → next/dynamic (ssr:false) → Phaser 3
       ↕ EventBus          ↕ Broadcast + Presence
  React vote / cards / Jarvis   Supabase Realtime
       ↓
  LiberWallet (Privy + Alchemy SCW, Arbitrum) + LiberCards.sol
```

```

## Game audit R1

Path: `docs/game-audit-liberwallet-r1.md`

```
# Deep Audit — Ether Game inside LiberWallet (post-migration, round 1)

Date: 2026-07-22. Scope: everything except smart contracts. Static review +
unit tests + live play (headed and headless Playwright) on `/tale-of-liber`
with local duel WS server.

## What was verified working

- Typecheck: no game-related errors (remaining errors are pre-existing in
  `src/lib/vault/*.test.ts` — BigInt target — and two `vitest` test files;
  unrelated to the game).
- Unit tests: `buildings.test.ts`, `townMap.test.ts`, `npcs.test.ts`,
  `gameSocket.lang.test.ts` — 24/24 pass.
- World boot on painted Magnolia, character create → enter, walk, y-sort,
  lights, day/night. No console page errors from Phaser.
- Map transition town → forest → town (fade + restart, ~1 s).
- Solo battle: arena zone → DeckSelect → skip → Battle vs AI → victory →
  Return to Town → World + UIOverlay + Dialogue wake correctly.
- Two-tab PvP duel end-to-end (distinct guest identities): queue → match →
  turns → Victory!/Defeat… screens with Rematch / Return to Town. Turn
  counts and HP mirrored correctly on both clients.
- Duel server matchmaking, same-address reconnect/replace ("replaced"
  banner) and rate limiting behave as designed. `catalog.json` and all
  duel imports resolve; Dockerfile copies every module.
- CSP already allows `ws://127.0.0.1:8080` and `wss://srv1698379.hstgr.cloud`.

Note for local testing: with `NEXT_PUBLIC_GAME_DEV_BYPASS=true` every tab
shares the same dev wallet, so PvP self-match is impossible (server replaces
the socket). Test PvP with `NEXT_PUBLIC_GAME_DEV_BYPASS=false
GAME_GUEST_PLAY_ENABLED=true` so each browser context gets its own guest
address. Supabase env (`NEXT_PUBLIC_SUPABASE_URL` / service key) is absent in
this machine's `.env.local`, so `/api/game/character|quests` return 500
locally — environment, not code.

## Fixes needed (prioritized)

### 1. HIGH — Double HUD: Phaser UIOverlay renders under the React GameHud

`WorldScene.create` always launches `UIOverlay` (`src/game/scenes/WorldScene.ts:208`),
and GameShell always renders `GameHud`. Live screenshots show both at once:
Phaser portrait "Aric Lv 28" + HP/MP bars behind the React profile card, two
minimaps top-right, Phaser quest chip + React quest tracker, Phaser dock
buttons (bottom-right circles) colliding with the React hotbar, Phaser
server pill "Magnolia (EU-1) · online" + React lang pill.

Fix:
- `createGame.ts`: accept `hostHud?: boolean`; set `registry.set('hostHud', true)`
  from `LiberGameCanvas`.
- `WorldScene.create`: skip `ensureOverlay('UIOverlay')` when
  `registry.get('hostHud')` is true (keep `Dialogue` — the React host has no
  dialogue UI). Also skip the UIOverlay wake in `ensureOverlay` after battle.
- Keep local-quest toasts: move quest toast emission to a small
  `world`-level toast (reuse `showBattleToast`) when `hostHud`, or forward
  `quest:updated` to the React tracker (see fix 5).

### 2. HIGH — Herald dialogue kicks the player out of the game

`herald-intro` has `onCompleteEvent: 'npc:open-vote'`
(`src/game/dialogue/scripts.ts:27`); GameShell's handler does `setOpen(false)`
+ `onOpenVotes()`. Verified live: finishing the herald intro closes the shell;
on `/tale-of-liber` it then hard-navigates to `/dashboard/governance`
(`MinimalPlay.tsx:36`). Talking to the main tutorial NPC ends your session.

Fix (host-side, keep the game running):
- GameShell `npc:open-vote`: do NOT `setOpen(false)`.
  - Standalone (`/tale-of-liber`): show an in-shell toast/panel linking to
    governance in a new tab (`window.open('/dashboard/governance', '_blank')`)
    or simply do nothing beyond a toast.
  - Governance page: call `onOpenVotes()` (scroll) without closing the shell
    (the shell only unmounts when `open` flips, so just removing
    `setOpen(false)` is enough there).

### 3. HIGH — React GameHud stays mounted during battle

Entering battle sleeps Phaser overlays but the React HUD (profile, minimap,
quest tracker, hotbar, chat, `pointer-events-auto`) stays over the battle
chrome — confirmed in duel screenshots; hotbar/chat overlap the hand cards
and can steal clicks.

Fix:
- `BattleScene` already emits `battle:start`-ish events (`battle:queue`,
  `duel:start`) — add a clean signal: emit `battle:scene` `{ active: true }`
  on `create` and `{ active: false }` on shutdown/return.
- GameShell: `const [inBattle, setInBattle] = useState(false)` from that
  event; render `GameHud`/ChatPanel only when `!inBattle` (keep QuestPanel &
  modals closed too).

### 4. MEDIUM — Missing i18n keys in standalone message set

`CharacterCreateModal` uses `createBody`, `bodyMale`, `bodyFemale`, but
`src/lib/game/gameMessages.ts` (used by the standalone `/tale-of-liber`
layout) lacks them → raw keys render in the UI ("GOVERNANCE.GAME.CREATEBODY")
and repeated `MISSING_MESSAGE` console errors. Confirmed live.

Fix: add the three keys to `gamePlayMessages` (Body / Male / Female).

### 5. MEDIUM — Two quest systems; PvP wins and local quests invisible to host

- Phaser runtime (`src/game/quests/*`, storage `ether-quests-v1`):
  welcome-magnolia, scout-the-edge, arena-honor (win_duel) — UI lived in the
  UIOverlay chip, which fix 1 disables under the host.
- Server quests (`/api/game/quests`, seed `meet-the-plaza`): talk/visit only;
  nothing posts `win_duel`; GameShell `battle:result` is `console.info` only.

Fix:
- GameShell/`useGameHudData`: listen to EventBus `quest:updated` and merge
  local quest lines into the React QuestTracker (label + n/m), so the
  vendored quest engine has UI again under the host.
- GameShell `battle:result`: when `won === true`, POST
  `/api/game/quests` with a `win_duel` objective (server route needs a
  `win_duel` case next to `talk_npc`/`visit_map`; add an `arena-honor` seed
  or extend `meet-the-plaza`). Points/rewards stay server-authoritative.

### 6. MEDIUM — Arena is PvP-only when the WS server is unreachable

`multiplayerEnabled={!createOpen}` is always true after character create, but
if the socket is down `joinDuel` fails → `duel:error` → queue ends with a
toast; there is no path to solo battle. On production WS outage the arena is
dead.

Fix (choose one, first preferred):
- `WorldScene.onDuelError`: after `endDuelQueue()`, offer solo fallback —
  show "Server unreachable — fighting the Arena Champion instead" toast and
  call `fadeToSoloBattle()`.
- Or: GameShell tracks socket connected state and flips the
  `multiplayerEnabled` registry flag live.

### 7. MEDIUM — Character-create cosmetics never show on the local player

`WorldScene` prefers the `player-hero` sheet whenever it exists (except
geared), so skin/hair/outfit picked in the create modal only shows to other
players (socket `sheetKey`), not to yourself.

Fix: in `applySheet`/spawn, when `hostHud` (LiberWallet) and session cosmetics
differ from `DEFAULT_COSMETICS`, use `resolveSheetKey(cosmetics, gear)` via
`ensurePlayerSheet` instead of `player-hero`. Keep `player-hero` for the
default look so the painted hero stays the showcase.

### 8. LOW — React Minimap remote dots dead

`hud/Minimap.tsx` listens to `multiplayer:move`/`multiplayer:sync`, which no
emitter fires anymore; remote players never appear. Fix: subscribe to
`multiplayer:snap` (batch) + `multiplayer:join`/`leave`/`reset`.

### 9. LOW — Cleanups

- `LiberGameCanvas`: LiberPixel font wait is leftover (new scenes use
  Georgia/monospace) — harmless, may drop.
- `CompanionPanel.tsx` is unused — delete or wire.
- `.env.example`: note that Supabase env is required for
  `/api/game/character|quests` and that PvP local testing needs
  dev-bypass off + guest play on.
- Dev-only `window.__LIBER_GAME` hook added during this audit (guarded by
  `NODE_ENV !== 'production'`) — keep for smoke scripts.

## Test plan after fixes

1. `npm run test:unit` (24 game tests) + typecheck.
2. `node scripts/audit-live-world.mjs` — world, transition, solo battle,
   return (script kept in repo).
3. `node scripts/audit-live-duel.mjs` — two-tab PvP with guest identities.
4. Manual: talk to herald on `/tale-of-liber` → game must stay open; battle →
   React HUD hidden; only one HUD in world; character create cosmetics
   visible on own player; kill WS server → arena falls back to solo.

```

## Card catalog (JSON)

Path: `src/game/cards/catalog.json`

```
{
  "$comment": "Single source of truth for battle cards. Client: game/cards/catalog.ts. Server: server/cards.mjs. Guild design: docs/guilds.md (max 1 guild card per match).",
  "commons": [
    {
      "id": "sprout-runner",
      "name": "Sprout Runner",
      "rarity": "bronze",
      "atk": 22,
      "def": 14,
      "sp": 10,
      "element": "earth",
      "stars": 2
    },
    {
      "id": "ledger-scribe",
      "name": "Ledger Scribe",
      "rarity": "bronze",
      "atk": 18,
      "def": 18,
      "sp": 14,
      "element": "neutral",
      "stars": 2
    },
    {
      "id": "canal-mender",
      "name": "Canal Mender",
      "rarity": "bronze",
      "atk": 20,
      "def": 16,
      "sp": 12,
      "element": "water",
      "stars": 2
    },
    {
      "id": "path-warden",
      "name": "Path Warden",
      "rarity": "silver",
      "atk": 24,
      "def": 18,
      "sp": 12,
      "element": "earth",
      "stars": 3
    },
    {
      "id": "reserve-keeper",
      "name": "Reserve Keeper",
      "rarity": "silver",
      "atk": 22,
      "def": 20,
      "sp": 14,
      "element": "water",
      "stars": 3
    },
    {
      "id": "arena-drummer",
      "name": "Arena Drummer",
      "rarity": "silver",
      "atk": 26,
      "def": 12,
      "sp": 14,
      "element": "fire",
      "stars": 3
    },
    {
      "id": "emerald-herald",
      "name": "Emerald Herald",
      "rarity": "gold",
      "atk": 24,
      "def": 16,
      "sp": 18,
      "element": "neutral",
      "stars": 4
    },
    {
      "id": "vault-phoenix",
      "name": "Vault Phoenix",
      "rarity": "gold",
      "atk": 28,
      "def": 12,
      "sp": 16,
      "element": "fire",
      "stars": 4
    }
  ],
  "guilds": [
    {
      "id": "guild-legendary-unicorns",
      "name": "Legendary Unicorns",
      "guildName": "Legendary Unicorns",
      "rarity": "gold",
      "atk": 26,
      "def": 20,
      "sp": 32,
      "signature": "sp",
      "element": "neutral",
      "stars": 5
    },
    {
      "id": "guild-ether-wardens",
      "name": "Ether Wardens",
      "guildName": "Ether Wardens",
      "rarity": "gold",
      "atk": 24,
      "def": 32,
      "sp": 18,
      "signature": "def",
      "element": "water",
      "stars": 5
    },
    {
      "id": "guild-phantom-court",
      "name": "Phantom Court",
      "guildName": "Phantom Court",
      "rarity": "gold",
      "atk": 24,
      "def": 32,
      "sp": 20,
      "signature": "def",
      "element": "neutral",
      "stars": 5
    },
    {
      "id": "guild-tidecallers",
      "name": "Tidecallers",
      "guildName": "Tidecallers",
      "rarity": "gold",
      "atk": 32,
      "def": 18,
      "sp": 18,
      "signature": "atk",
      "element": "water",
      "stars": 5
    },
    {
      "id": "guild-spartan-synths",
      "name": "Spartan Synths",
      "guildName": "Spartan Synths",
      "rarity": "gold",
      "atk": 26,
      "def": 18,
      "sp": 32,
      "signature": "sp",
      "element": "fire",
      "stars": 5
    },
    {
      "id": "guild-the-trueborn",
      "name": "The Trueborn",
      "guildName": "The Trueborn",
      "rarity": "gold",
      "atk": 22,
      "def": 32,
      "sp": 20,
      "signature": "def",
      "element": "earth",
      "stars": 5
    },
    {
      "id": "guild-horizon-keepers",
      "name": "Horizon Keepers",
      "guildName": "Horizon Keepers",
      "rarity": "gold",
      "atk": 32,
      "def": 16,
      "sp": 20,
      "signature": "atk",
      "element": "earth",
      "stars": 5
    },
    {
      "id": "guild-nitro-knights",
      "name": "Nitro Knights",
      "guildName": "Nitro Knights",
      "rarity": "gold",
      "atk": 32,
      "def": 18,
      "sp": 16,
      "signature": "atk",
      "element": "fire",
      "stars": 5
    },
    {
      "id": "guild-the-rocketeers",
      "name": "The Rocketeers",
      "guildName": "The Rocketeers",
      "rarity": "gold",
      "atk": 24,
      "def": 18,
      "sp": 32,
      "signature": "sp",
      "element": "ice",
      "stars": 5
    }
  ]
}

```

## Card odds / mint economy

Path: `src/lib/game/cardOdds.ts`

```
/**
 * LiberCards mint economy (fixed stake).
 * - Always 1 SLETH per mint (hard cap — no higher stake).
 * - Odds: 60% bronze / 30% silver / 10% gold.
 * - 10% of SLETH → treasury, 90% locked in the NFT (refunded on unmint).
 */

export const MINT_SLETH = 1;
export const MINT_SLETH_WEI = BigInt('1000000000000000000');
export const TREASURY_BPS = BigInt(1000); // 10%
export const LOCKED_BPS = BigInt(9000); // 90%
export const LOCKED_SLETH = 0.9;

export type { CardRarity } from '@/game/cards/types';
import type { CardRarity } from '@/game/cards/types';

export type CardStats = {
  attack: number;
  defense: number;
  special: number;
};

const RARITY_BUDGET: Record<CardRarity, number> = {
  bronze: 24,
  silver: 36,
  gold: 54,
};

/** Draw rarity with fixed 60/30/10 odds. */
export function drawRarity(rng: () => number = Math.random): CardRarity {
  const roll = rng();
  if (roll < 0.6) return 'bronze';
  if (roll < 0.9) return 'silver';
  return 'gold';
}

/** Split a rarity budget into attack/defense/special using a seed. */
export function statsFromSeed(rarity: CardRarity, seedHex: string): CardStats {
  const budget = RARITY_BUDGET[rarity];
  const a = (parseInt(seedHex.slice(2, 6) || '1', 16) % 1000) / 1000;
  const b = (parseInt(seedHex.slice(6, 10) || '1', 16) % 1000) / 1000;
  const attack = Math.max(1, Math.floor(budget * (0.25 + a * 0.4)));
  const defense = Math.max(1, Math.floor(budget * (0.2 + b * 0.35)));
  const special = Math.max(1, budget - attack - defense);
  return { attack, defense, special };
}

```

## Client turn machine

Path: `src/game/battle/turnMachine.ts`

```
import type {
  BattleAction,
  BattleActionInput,
  BattleCard,
  BattleState,
  FighterState,
} from '@/game/battle/types';

export const TURN_TIMER_SEC = 30;
export const MAX_GUILD_CARDS = 1;
/** Guild signature: +25% ATK and ignore half of target defend bonus. */
export const GUILD_ATK_MULT = 1.25;
export const AI_DEFEND_HP_RATIO = 0.35;
export const AI_GUILD_PLAYER_HP_RATIO = 0.5;

/** Demo hand matching art-target card names (placeholder stats). */
export function demoHand(seed = 1): BattleCard[] {
  return [
    {
      id: `sunflare-${seed}`,
      name: 'Sunflare Drake',
      rarity: 'silver',
      atk: 24,
      def: 18,
      sp: 12,
      element: 'fire',
      stars: 3,
    },
    {
      id: `aqua-${seed}`,
      name: 'Aqua Sentinel',
      rarity: 'silver',
      atk: 24,
      def: 18,
      sp: 12,
      element: 'water',
      stars: 3,
    },
    {
      id: `forest-${seed}`,
      name: 'Forest Guardian',
      rarity: 'bronze',
      atk: 24,
      def: 18,
      sp: 12,
      element: 'earth',
      stars: 3,
    },
    {
      id: `frost-${seed}`,
      name: 'Frost Slash',
      rarity: 'gold',
      atk: 24,
      def: 10,
      sp: 16,
      element: 'ice',
      stars: 4,
    },
  ];
}

export function demoGuildCard(id = 'guild-unicorns'): BattleCard {
  return {
    id,
    name: 'Legendary Unicorns',
    rarity: 'gold',
    atk: 30,
    def: 22,
    sp: 20,
    isGuild: true,
    guildName: 'Legendary Unicorns',
    element: 'neutral',
    stars: 5,
  };
}

function cloneFighter(f: FighterState): FighterState {
  return {
    ...f,
    hand: f.hand.map((c) => ({ ...c })),
    guildCard: f.guildCard ? { ...f.guildCard } : null,
  };
}

export function createInitialBattle(opts?: {
  playerName?: string;
  opponentName?: string;
  spectators?: number;
  /** Give opponent a guild card for AI signature testing. */
  opponentGuild?: boolean;
  /** M7: player's picked hand (defaults to demo hand). */
  hand?: BattleCard[];
  /** M7: picked guild card; `null` = explicitly none, `undefined` = demo guild. */
  guildCard?: BattleCard | null;
}): BattleState {
  const playerHand = opts?.hand ?? demoHand(1);
  const guild = opts?.guildCard === undefined ? demoGuildCard() : opts.guildCard;
  const opponentHand = demoHand(2);
  const oppGuild = opts?.opponentGuild ? demoGuildCard('guild-opp-unicorns') : null;

  const player: FighterState = {
    id: 'player',
    name: 'Vault Phoenix',
    hp: 152,
    maxHp: 152,
    hand: playerHand,
    guildCard: guild,
    guildUsed: false,
    defendBonus: 0,
  };

  const opponent: FighterState = {
    id: 'opponent',
    name: 'Sprout Runner',
    hp: 128,
    maxHp: 128,
    hand: opponentHand,
    guildCard: oppGuild,
    guildUsed: false,
    defendBonus: 0,
  };

  return {
    phase: 'player_turn',
    turn: 1,
    timerSec: TURN_TIMER_SEC,
    spectators: opts?.spectators ?? 6,
    arena: 'Magnolia Arena',
    playerName: opts?.playerName ?? 'Libertador',
    opponentName: opts?.opponentName ?? 'EtherKnight',
    player,
    opponent,
    selectedCardId: playerHand[0]?.id ?? null,
    lastPlayed: null,
    timedOut: false,
    log: [{ text: 'Duel begins — choose Attack • Defend • Special', ts: Date.now() }],
  };
}

/** Count distinct guild cards among equipped + proposed cards. */
export function guildCardCount(fighter: FighterState, cards: BattleCard[]): number {
  let n = 0;
  if (fighter.guildCard) n += 1;
  for (const c of cards) {
    if (c.isGuild && c.id !== fighter.guildCard?.id) n += 1;
  }
  return n;
}

export function canEquipGuild(fighter: FighterState, card: BattleCard): boolean {
  if (!card.isGuild) return true;
  if (fighter.guildCard && fighter.guildCard.id !== card.id) return false;
  return guildCardCount(fighter, [card]) <= MAX_GUILD_CARDS;
}

function findCard(fighter: FighterState, cardId: string | undefined): BattleCard | null {
  if (!cardId) return fighter.hand[0] ?? null;
  if (fighter.guildCard && fighter.guildCard.id === cardId) {
    return fighter.guildCard;
  }
  return fighter.hand.find((c) => c.id === cardId) ?? null;
}

function clampHp(f: FighterState) {
  f.hp = Math.max(0, Math.min(f.maxHp, f.hp));
}

function resolveAction(
  actor: FighterState,
  target: FighterState,
  action: BattleAction,
  card: BattleCard | null,
): string {
  const isGuild = Boolean(card?.isGuild);
  let atk = card?.atk ?? 10;
  const def = card?.def ?? 8;
  const sp = card?.sp ?? 6;
  const label = card?.name ?? 'Strike';

  if (isGuild) {
    atk = Math.floor(atk * GUILD_ATK_MULT);
  }

  switch (action) {
    case 'attack': {
      const defendMitigation = isGuild
        ? Math.floor(target.defendBonus / 2)
        : target.defendBonus;
      const mitigated = Math.max(1, atk - defendMitigation);
      target.hp -= mitigated;
      target.defendBonus = 0;
      clampHp(target);
      const tag = isGuild ? ' [SIGNATURE]' : '';
      return `${actor.name} played ${label}${tag} — ATK ${mitigated}`;
    }
    case 'defend': {
      const bonus = Math.max(2, Math.floor(def / 4));
      actor.defendBonus += bonus;
      return `${actor.name} played Defend +${bonus}`;
    }
    case 'special': {
      const raw = Math.floor(atk * 0.6 + sp * 0.8);
      const defendHalf = isGuild
        ? Math.floor(target.defendBonus / 4)
        : Math.floor(target.defendBonus / 2);
      const mitigated = Math.max(1, raw - defendHalf);
      target.hp -= mitigated;
      target.defendBonus = Math.max(0, target.defendBonus - 2);
      clampHp(target);
      const tag = isGuild ? ' [SIGNATURE]' : '';
      return `${actor.name} played Special (${label})${tag} — ${mitigated} dmg`;
    }
    default:
      return `${actor.name} hesitated`;
  }
}

function checkEnd(state: BattleState): BattleState {
  if (state.opponent.hp <= 0) {
    return {
      ...state,
      phase: 'victory',
      log: [...state.log, { text: 'Victory!', ts: Date.now() }],
    };
  }
  if (state.player.hp <= 0) {
    return {
      ...state,
      phase: 'defeat',
      log: [...state.log, { text: 'Defeat…', ts: Date.now() }],
    };
  }
  return state;
}

function markGuildUsed(
  fighter: FighterState,
  card: BattleCard | null,
  action: BattleAction,
) {
  // Signature is spent only when used offensively (not on Defend).
  if (action === 'defend') return;
  if (card?.isGuild && fighter.guildCard && card.id === fighter.guildCard.id) {
    fighter.guildUsed = true;
  }
}

/**
 * Apply a player action. Pure — returns a new state.
 * Enforces max 1 guild card and once-per-match signature play.
 */
export function applyPlayerAction(
  state: BattleState,
  input: BattleActionInput,
): BattleState {
  if (state.phase !== 'player_turn') return state;

  let cardId = input.cardId ?? state.selectedCardId ?? undefined;
  let card = findCard(state.player, cardId);

  if (card?.isGuild && !canEquipGuild(state.player, card)) {
    return {
      ...state,
      timedOut: false,
      log: [
        ...state.log,
        { text: 'Only one guild card per match (max 1).', ts: Date.now() },
      ],
    };
  }

  // Spent signature: fall back to a basic hand card so Attack/Defend never soft-lock.
  if (card?.isGuild && state.player.guildUsed) {
    cardId = state.player.hand[0]?.id;
    card = findCard(state.player, cardId);
  }

  const player = cloneFighter(state.player);
  const opponent = cloneFighter(state.opponent);
  const text = resolveAction(player, opponent, input.action, card);
  markGuildUsed(player, card, input.action);

  // Clear selection only when the signature was actually consumed (not Defend).
  const guildConsumed = Boolean(card?.isGuild && input.action !== 'defend');
  let next: BattleState = {
    ...state,
    phase: 'resolving',
    player,
    opponent,
    selectedCardId: guildConsumed
      ? null
      : (card?.id ?? state.selectedCardId),
    lastPlayed: { side: 'player', card, action: input.action },
    timedOut: false,
    log: [...state.log, { text, ts: Date.now() }],
    timerSec: TURN_TIMER_SEC,
  };

  next = checkEnd(next);
  if (next.phase === 'victory' || next.phase === 'defeat') return next;

  return applyOpponentAction(next);
}

/** Deterministic pick from turn seed: 0..99. */
function turnRoll(turn: number): number {
  return (turn * 37 + 11) % 100;
}

/**
 * AI: defend under 35% HP; else ~70% attack / 30% special.
 * Uses guild signature once when player HP < 50%.
 */
export function applyOpponentAction(state: BattleState): BattleState {
  const player = cloneFighter(state.player);
  const opponent = cloneFighter(state.opponent);

  let action: BattleAction;
  let card: BattleCard | null = opponent.hand[0] ?? null;

  const useGuild =
    opponent.guildCard &&
    !opponent.guildUsed &&
    player.hp < player.maxHp * AI_GUILD_PLAYER_HP_RATIO;

  if (useGuild && opponent.guildCard) {
    card = opponent.guildCard;
    action = 'special';
  } else if (opponent.hp < opponent.maxHp * AI_DEFEND_HP_RATIO) {
    action = 'defend';
    card = opponent.hand[1] ?? opponent.hand[0] ?? null;
  } else {
    const roll = turnRoll(state.turn);
    action = roll < 70 ? 'attack' : 'special';
    const idx = state.turn % Math.max(opponent.hand.length, 1);
    card = opponent.hand[idx] ?? opponent.hand[0] ?? null;
  }

  const text = resolveAction(opponent, player, action, card);
  markGuildUsed(opponent, card, action);

  let next: BattleState = {
    ...state,
    phase: 'player_turn',
    turn: state.turn + 1,
    player,
    opponent,
    lastPlayed: { side: 'opponent', card, action },
    timedOut: false,
    log: [...state.log, { text, ts: Date.now() }],
    timerSec: TURN_TIMER_SEC,
  };

  return checkEnd(next);
}

export function tickTimer(state: BattleState, dtSec: number): BattleState {
  if (state.phase !== 'player_turn' && state.phase !== 'opponent_turn') {
    return state;
  }
  const timerSec = Math.max(0, state.timerSec - dtSec);
  if (timerSec > 0) return { ...state, timerSec, timedOut: false };

  if (state.phase === 'player_turn') {
    const next = applyPlayerAction(
      { ...state, timerSec: 0 },
      { action: 'defend' },
    );
    if (next.log.length > state.log.length) {
      const autoLine = {
        text: "Time's up — auto Defend.",
        ts: Date.now(),
      };
      // Insert timeout notice before the defend log line when possible.
      const log = [...next.log];
      const insertAt = Math.max(0, log.length - (next.phase === 'player_turn' ? 2 : 1));
      // Prefer prepending notice right before the last player action line.
      const lastIdx = log.length - 1;
      if (next.phase === 'victory' || next.phase === 'defeat') {
        log.splice(lastIdx, 0, autoLine);
      } else {
        // After player defend + opponent reply: insert before those.
        const playerLineIdx = log.findIndex(
          (e, i) => i >= state.log.length && e.text.includes('Defend'),
        );
        if (playerLineIdx >= 0) log.splice(playerLineIdx, 0, autoLine);
        else log.splice(insertAt, 0, autoLine);
      }
      return { ...next, timedOut: true, log };
    }
    return { ...next, timedOut: true };
  }
  return { ...state, timerSec: 0 };
}

export function selectCard(state: BattleState, cardId: string): BattleState {
  const inHand = state.player.hand.some((c) => c.id === cardId);
  const isGuild = state.player.guildCard?.id === cardId;
  if (!inHand && !isGuild) return state;
  if (isGuild && state.player.guildUsed) {
    return {
      ...state,
      log: [
        ...state.log,
        { text: 'Signature move already used.', ts: Date.now() },
      ],
    };
  }
  return { ...state, selectedCardId: cardId };
}

/**
 * Pure AI-vs-AI simulation for balance tests.
 * Both sides use applyOpponentAction-style logic via alternating player auto-attacks.
 * Returns turns completed when duel ends (or maxTurns if unfinished).
 */
export function simulateDuel(maxTurns = 40): {
  turns: number;
  phase: BattleState['phase'];
  playerHp: number;
  opponentHp: number;
} {
  let state = createInitialBattle({ opponentGuild: true });
  let guard = 0;

  while (
    state.phase !== 'victory' &&
    state.phase !== 'defeat' &&
    state.turn <= maxTurns &&
    guard < maxTurns * 2
  ) {
    guard += 1;
    if (state.phase !== 'player_turn') break;

    // Player side also uses simple AI for simulation.
    const p = state.player;
    let action: BattleAction;
    let cardId: string | undefined;

    const useGuild =
      p.guildCard && !p.guildUsed && state.opponent.hp < state.opponent.maxHp * 0.5;

    if (useGuild && p.guildCard) {
      action = 'special';
      cardId = p.guildCard.id;
    } else if (p.hp < p.maxHp * AI_DEFEND_HP_RATIO) {
      action = 'defend';
      cardId = p.hand[0]?.id;
    } else {
      action = turnRoll(state.turn + 3) < 70 ? 'attack' : 'special';
      cardId = p.hand[state.turn % p.hand.length]?.id;
    }

    state = applyPlayerAction(state, { action, cardId });
  }

  return {
    turns: state.turn,
    phase: state.phase,
    playerHp: state.player.hp,
    opponentHp: state.opponent.hp,
  };
}

```

## Server duel engine

Path: `server/game/duelEngine.mjs`

```
/**
 * Pure PvP duel engine for Node (M5).
 * Mirrors game/battle/turnMachine.ts combat math, but two-sided (no AI chain).
 */

export const TURN_TIMER_SEC = Number(process.env.DUEL_TIMER_SEC || 30);
export const GUILD_ATK_MULT = 1.25;

export function demoHand(seed = 1) {
  return [
    {
      id: `sunflare-${seed}`,
      name: 'Sunflare Drake',
      rarity: 'silver',
      atk: 24,
      def: 18,
      sp: 12,
      element: 'fire',
      stars: 3,
    },
    {
      id: `aqua-${seed}`,
      name: 'Aqua Sentinel',
      rarity: 'silver',
      atk: 24,
      def: 18,
      sp: 12,
      element: 'water',
      stars: 3,
    },
    {
      id: `forest-${seed}`,
      name: 'Forest Guardian',
      rarity: 'bronze',
      atk: 24,
      def: 18,
      sp: 12,
      element: 'earth',
      stars: 3,
    },
    {
      id: `frost-${seed}`,
      name: 'Frost Slash',
      rarity: 'gold',
      atk: 24,
      def: 10,
      sp: 16,
      element: 'ice',
      stars: 4,
    },
  ];
}

export function demoGuildCard(id = 'guild-unicorns') {
  return {
    id,
    name: 'Legendary Unicorns',
    rarity: 'gold',
    atk: 30,
    def: 22,
    sp: 20,
    isGuild: true,
    guildName: 'Legendary Unicorns',
    element: 'neutral',
    stars: 5,
  };
}

function cloneFighter(f) {
  return {
    ...f,
    hand: f.hand.map((c) => ({ ...c })),
    guildCard: f.guildCard ? { ...f.guildCard } : null,
  };
}

function findCard(fighter, cardId) {
  if (!cardId) return fighter.hand[0] ?? null;
  if (fighter.guildCard && fighter.guildCard.id === cardId) return fighter.guildCard;
  return fighter.hand.find((c) => c.id === cardId) ?? null;
}

function clampHp(f) {
  f.hp = Math.max(0, Math.min(f.maxHp, f.hp));
}

function resolveAction(actor, target, action, card) {
  const isGuild = Boolean(card?.isGuild);
  let atk = card?.atk ?? 10;
  const def = card?.def ?? 8;
  const sp = card?.sp ?? 6;
  const label = card?.name ?? 'Strike';
  if (isGuild) atk = Math.floor(atk * GUILD_ATK_MULT);

  if (action === 'attack') {
    const defendMitigation = isGuild
      ? Math.floor(target.defendBonus / 2)
      : target.defendBonus;
    const mitigated = Math.max(1, atk - defendMitigation);
    target.hp -= mitigated;
    target.defendBonus = 0;
    clampHp(target);
    const tag = isGuild ? ' [SIGNATURE]' : '';
    return `${actor.name} played ${label}${tag} — ATK ${mitigated}`;
  }
  if (action === 'defend') {
    const bonus = Math.max(2, Math.floor(def / 4));
    actor.defendBonus += bonus;
    return `${actor.name} played Defend +${bonus}`;
  }
  if (action === 'special') {
    const raw = Math.floor(atk * 0.6 + sp * 0.8);
    const defendHalf = isGuild
      ? Math.floor(target.defendBonus / 4)
      : Math.floor(target.defendBonus / 2);
    const mitigated = Math.max(1, raw - defendHalf);
    target.hp -= mitigated;
    target.defendBonus = Math.max(0, target.defendBonus - 2);
    clampHp(target);
    const tag = isGuild ? ' [SIGNATURE]' : '';
    return `${actor.name} played Special (${label})${tag} — ${mitigated} dmg`;
  }
  return `${actor.name} hesitated`;
}

function markGuildUsed(fighter, card, action) {
  if (action === 'defend') return;
  if (card?.isGuild && fighter.guildCard && card.id === fighter.guildCard.id) {
    fighter.guildUsed = true;
  }
}

function makeFighter(address, name, seed, hand, guildCard) {
  return {
    address,
    name: name || `Fighter ${seed}`,
    hp: seed === 1 ? 152 : 128,
    maxHp: seed === 1 ? 152 : 128,
    hand: hand ?? demoHand(seed),
    // `guildCard === undefined` → default demo guild; `null` → explicitly none.
    guildCard: guildCard === undefined ? demoGuildCard(`guild-${seed}`) : guildCard,
    guildUsed: false,
    defendBonus: 0,
  };
}

/**
 * @param {{ address: string, name?: string, hand?: Array<object>, guildCard?: object | null }} a
 * @param {{ address: string, name?: string, hand?: Array<object>, guildCard?: object | null }} b
 */
export function createDuel(a, b) {
  return {
    fighters: {
      a: makeFighter(a.address, a.name, 1, a.hand, a.guildCard),
      b: makeFighter(b.address, b.name, 2, b.hand, b.guildCard),
    },
    activeSide: 'a',
    turn: 1,
    timerSec: TURN_TIMER_SEC,
    phase: 'active', // active | ended
    log: [{ text: 'Duel begins — choose Attack • Defend • Special', ts: Date.now() }],
    lastPlayed: null,
    winner: null, // 'a' | 'b' | null
    timedOut: false,
  };
}

function checkEnd(state) {
  if (state.fighters.a.hp <= 0) {
    return {
      ...state,
      phase: 'ended',
      winner: 'b',
      log: [...state.log, { text: `${state.fighters.b.name} wins!`, ts: Date.now() }],
    };
  }
  if (state.fighters.b.hp <= 0) {
    return {
      ...state,
      phase: 'ended',
      winner: 'a',
      log: [...state.log, { text: `${state.fighters.a.name} wins!`, ts: Date.now() }],
    };
  }
  return state;
}

/**
 * Apply an action for `side` ('a' | 'b').
 * Returns { ok, state, error? }.
 */
export function applyAction(state, side, input) {
  if (state.phase !== 'active') {
    return { ok: false, state, error: 'duel_ended' };
  }
  if (side !== 'a' && side !== 'b') {
    return { ok: false, state, error: 'bad_side' };
  }
  if (state.activeSide !== side) {
    return { ok: false, state, error: 'not_your_turn' };
  }

  const action = input?.action;
  if (action !== 'attack' && action !== 'defend' && action !== 'special') {
    return { ok: false, state, error: 'bad_action' };
  }

  const actor = cloneFighter(state.fighters[side]);
  const otherSide = side === 'a' ? 'b' : 'a';
  const target = cloneFighter(state.fighters[otherSide]);
  const card = findCard(actor, input?.cardId);

  if (input?.cardId && !card) {
    return { ok: false, state, error: 'bad_card' };
  }
  if (card?.isGuild && actor.guildUsed) {
    return { ok: false, state, error: 'guild_used' };
  }

  const text = resolveAction(actor, target, action, card);
  markGuildUsed(actor, card, action);

  let next = {
    ...state,
    fighters: {
      a: side === 'a' ? actor : target,
      b: side === 'b' ? actor : target,
    },
    lastPlayed: { side, card, action },
    timedOut: false,
    log: [...state.log, { text, ts: Date.now() }],
    timerSec: TURN_TIMER_SEC,
  };

  next = checkEnd(next);
  if (next.phase === 'ended') return { ok: true, state: next };

  // After B acts, wrap to A and increment turn number
  const nextTurn = otherSide === 'a' ? state.turn + 1 : state.turn;
  next = {
    ...next,
    activeSide: otherSide,
    turn: nextTurn,
  };

  return { ok: true, state: next };
}

/** Tick the turn timer. On timeout, auto-defend for the active side. */
export function tickTimer(state, dtSec) {
  if (state.phase !== 'active') return { ok: true, state, timedOut: false };
  const timerSec = Math.max(0, state.timerSec - dtSec);
  if (timerSec > 0) {
    return { ok: true, state: { ...state, timerSec, timedOut: false }, timedOut: false };
  }

  const result = applyAction(
    { ...state, timerSec: 0 },
    state.activeSide,
    { action: 'defend' },
  );
  if (!result.ok) {
    return { ok: true, state: { ...state, timerSec: 0 }, timedOut: false };
  }
  const log = [...result.state.log];
  // Insert notice before the last defend line
  const autoLine = { text: "Time's up — auto Defend.", ts: Date.now() };
  const lastIdx = log.length - 1;
  if (lastIdx >= 0) log.splice(lastIdx, 0, autoLine);
  else log.push(autoLine);
  return {
    ok: true,
    state: { ...result.state, timedOut: true, log },
    timedOut: true,
  };
}

/** Public view for a fighter (own hand) or spectator (no hands). */
export function publicState(state, viewerSide = null) {
  const sanitizeFighter = (f, revealHand) => ({
    address: f.address,
    name: f.name,
    hp: f.hp,
    maxHp: f.maxHp,
    handSize: f.hand.length,
    hand: revealHand ? f.hand.map((c) => ({ ...c })) : undefined,
    guildCard: revealHand && f.guildCard ? { ...f.guildCard } : f.guildCard
      ? { id: f.guildCard.id, name: f.guildCard.name, isGuild: true, guildUsed: f.guildUsed }
      : null,
    guildUsed: f.guildUsed,
    defendBonus: f.defendBonus,
  });

  return {
    activeSide: state.activeSide,
    turn: state.turn,
    timerSec: state.timerSec,
    phase: state.phase,
    winner: state.winner,
    timedOut: state.timedOut,
    lastPlayed: state.lastPlayed
      ? {
          side: state.lastPlayed.side,
          action: state.lastPlayed.action,
          card: state.lastPlayed.card
            ? {
                id: state.lastPlayed.card.id,
                name: state.lastPlayed.card.name,
                atk: state.lastPlayed.card.atk,
                element: state.lastPlayed.card.element,
                stars: state.lastPlayed.card.stars,
                isGuild: state.lastPlayed.card.isGuild,
              }
            : null,
        }
      : null,
    log: state.log.slice(-8),
    fighters: {
      a: sanitizeFighter(state.fighters.a, viewerSide === 'a'),
      b: sanitizeFighter(state.fighters.b, viewerSide === 'b'),
    },
  };
}

```

## Product constraints (tokenomics — design only, no deploys in Phase 1)

- LiberCards: ERC-721, 1 SLETH mint, voucher rarity/stats, unmint refund of locked SLETH. Coded+tested; address env empty.
- SLETH address (Arbitrum): 0x4064BFC0c404bE8F472bac81934714b2d2043869 — verify before any onchain work.
- Future: Land NFT sales; MagnoliaCityFund receives proceeds; redistribute by loyalty points; LiberPass membership + referrals grow loyalty.
- Guild NFT mint (guild token + 1 SLETH tier) — design doc only.
