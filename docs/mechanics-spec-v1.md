# Magnolia Arena — Mechanics Spec v1

Status: **design for implementation** (grounded in current `turnMachine` / `duelEngine`). Hermes Phase-1 deliverable.

## Current loop (shipped)

1. Queue at arena → deck select (3 cards + optional 1 guild).
2. Simultaneous seats A/B; turn timer (default 30s).
3. Actions: **Attack** | **Defend** | **Special** using selected card.
4. Guild signature: ATK ×1.25, once per match (defend does not consume).
5. Timeout → auto Defend. Disconnect → forfeit after grace.

## Goals

- Deeper decisions without rewriting the three-button UX (target images).
- Fair F2P path; SLETH/card ownership adds expression, not mandatory win.
- Retention: daily quests, streaks, ranked seasons — loyalty points feed Magnolia fund narrative.

## 1. SP economy (incremental)

- Each fighter starts with **SP bank = 0**, max **10**.
- **Attack**: no SP cost; generate +1 SP (cap 10).
- **Defend**: no SP cost; generate +1 SP; keep existing defendBonus math.
- **Special**: costs **3 SP**; if insufficient, treat as Attack (client warns; server rejects with `need_sp` then client fallback — or allow Special only when SP≥3).
- Guild Special costs **5 SP** but keeps signature multiplier.

Migration: add `spBank` to fighter state in `duelEngine.mjs` + client machine; show SP pips on HUD.

## 2. Elements (soft RPS)

Elements already on catalog: fire / water / earth / ice / neutral.

| Attacker → Defender | Modifier |
|---------------------|----------|
| fire → ice | +15% dmg |
| ice → fire | +15% |
| water → fire | +15% |
| earth → water | +15% |
| Same element | −10% |
| Involving neutral / guild | 0% |

Apply only on Attack/Special after defend mitigation. Document in card tooltips.

## 3. Status (light)

- **Defend stack** already exists (`defendBonus`). Cap at **+12**.
- **Burn** (fire Special): 2 dmg at start of victim’s next turn, once.
- **Guard break** (earth Attack vs defendBonus≥6): ignore half defendBonus.

Keep statuses to ≤1 active token per fighter for readability.

## 4. Ranked ladder + seasons

- Modes: **Casual** (current) · **Ranked** (season MMR).
- Season = 28 days. Ranks: Sprout → Runner → Knight → Phoenix → Magnolia.
- Placement: 5 matches. Soft reset (−30% MMR toward 1000) each season.
- Rewards: loyalty points + cosmetic titles (offchain). No SLETH emission from ranked.

## 5. Retention loops

| Loop | Cadence | Reward |
|------|---------|--------|
| Daily duel | 1 win | +points |
| Win streak | 3 / 5 | bonus points |
| Card of the day | play listed card | small bonus |
| LiberPass referral | ongoing | loyalty → Magnolia fund share (future) |

Unify quest claims through `/api/game/quests` (retire dual local quest system — see audit).

## 6. Anti-pay-to-win

- Owned LiberCards (once deployed) gate cosmetics + deck legality, not raw +ATK beyond voucher stats.
- Guild tier power stays design-capped; one guild slot forever.
- Land NFTs (future) never appear in duel math — overworld / meta only.

## Implementation order

1. SP bank + HUD pips  
2. Element modifiers  
3. Status: burn + guard break  
4. Ranked MMR table + season config  
5. Daily/streak quests wired to service-role claims  

## Telemetry hooks

`game_matches.actions[]` already logs action mix — Hermes Analyzer uses this to validate SP/element patches after each release.
