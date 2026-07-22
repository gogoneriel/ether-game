# Graphics gap report — prototype → target HD-2D

Status: Hermes Phase-1 visual north star. Pipeline: `.cursor/skills/pixel-art-pipeline` + `hd2d-phaser-fx`.

## Current vs target

| Layer | Current (prototype) | Target (images B–D) |
|-------|---------------------|---------------------|
| Arena BG | Dark blocky silhouette | Sunset Magnolia City, domes, mountains, lit windows |
| Floor | Flat / oval glow only | Stone circle + cyan/green runes |
| Fighters | Often card stand-ins | Full pixel characters (winged Vault Phoenix vs Sprout Runner) |
| Active card VFX | Minimal | Elemental bursts (ice shards, fire ring) |
| Bottom UI | Plain panels | Ornate wood/gold tray, parchment prompt |
| Actions | Text buttons | Filigree ATK / DEF / SPECIAL with sword/shield/star icons |
| Cards | Simple borders + RGB stat boxes | Element frames, portraits, ATK/DEF/SP labels, star rarity |
| Special slot | Basic | Legendary Unicorns (or equipped guild) max-1 slot |
| Chrome | Timer / spectators basic | Gold timer frame, eye + spectator count |

## Asset shot list (priority)

### P0 — Arena readable at phone width

1. `battle-arena-magnolia-bg.png` (+ optional `_n.png` normal) — 1920×1080 HD-2D  
2. `battle-rune-circle.png` — floor overlay  
3. Fighter sprites (idle + attack + defend + hurt):  
   - `fighter-vault-phoenix.png`  
   - `fighter-sprout-runner.png`  
4. Action button icons: `ui-atk.png`, `ui-def.png`, `ui-sp.png`  
5. UI tray 9-slice: `ui-battle-tray.png`

### P1 — Cards & VFX

6. Card frame set: bronze / silver / gold + element trims (fire/water/earth/ice)  
7. Portrait art for catalog commons (start: Sunflare Drake, Aqua Sentinel, Forest Guardian, Frost Slash)  
8. Particle textures: ice shard, ember, leaf, sparkle  
9. Guild emblem icons (9 guilds)

### P2 — Polish

10. Banner props L/R  
11. CRT/light grading via existing FX quality tiers (lite = off)  
12. Spectator/timer chrome frames

## Phaser integration map

| Asset | Likely home |
|-------|-------------|
| BG + runes | `BattleScene` background layers / parallax |
| Fighters | `BattleScene` sprites; depth by y |
| Tray + buttons | React HUD **or** Phaser UI layer — prefer **one** (audit: kill double HUD) |
| Card hand | Match target tray; reuse catalog ids |
| VFX | `src/game/fx` particles on `lastPlayed` |

## Licensing

- Prefer CC0 / LPC / Kenney; log every file in `assets/CREDITS.md` (ether-game) or `public/game/CREDITS.md`.
- No copyrighted anime rips.

## Acceptance (visual)

- Side-by-side screenshot vs Image C/D: same header info, tray composition, three action affordances, elemental cards with stars, cinematic BG readable on 390px width.
- 55+ FPS on mid Android in lite quality tier.
