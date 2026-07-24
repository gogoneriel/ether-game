# Magnolia map contract

Pain (and Cloud agents) follow this when changing Magnolia town art or walkability.

## Grid

| Property | Value |
|----------|-------|
| Tiles | 28 × 22 |
| Tile size | 64 px |
| Display size | **1792 × 1408** |
| Hi-res (@2x) | **3584 × 2816** (`town-painted@2x.png`) for sharp zoom |

Game display always fills 1792×1408 (`MAP_BOUNDS.town`). High quality loads the @2x texture and scales it down in the scene.

## Two-image convention (playable maps)

1. **Beauty** — finished painted map, no neon green, no text/people.
2. **Walkable mask** — same framing; all walkable ground flat opaque **`#00FF00`**; everything else unchanged (not green).

Hard-edged green only. No glow, transparency, or gradient.

**Must stay non-green:** water, ponds, trees, bushes, fences, walls, roofs, building bodies, tents, statues, fountain / crystal.

**Must be green:** roads, central plaza (around fountain, not on it), bridges, market ground between tents, small aprons in front of every building door, and every road that exits the map edge.

## Hi-detail quadrant redraw (zoom)

When upscaling Magnolia for sharper zoom:

1. Cut `town-paintedV2.png` with `node scripts/crop-v2-quadrants.mjs` → `scripts/assets/v2-crops/{tl,tr,bl,br}.png` (Liberview).
2. In ChatGPT (or similar), attach **only one crop** per message and redraw that exact quarter at higher detail — see `scripts/assets/MAGNOLIA_V2_QUADRANT_PROMPTS.md` in Liberview.
3. Stitch: `node scripts/stitch-v2-quadrants.mjs --tl q-tl.png --tr q-tr.png --bl q-bl.png --br q-br.png`
4. Import mask: `node scripts/import-walkable-mask.mjs --mask town-mask.png`
5. `npm run test:unit`

## Fixed gameplay anchors (Magnolia)

These tiles must stay walkable (import script force-walks them if the mask misses):

| Anchor | Tile (approx) |
|--------|----------------|
| Player spawn | 14, 14 |
| Forest gate (north) | tiles under `to-forest` (~12–15, rows 1–2) |
| Arena gate (east) | tiles under `to-arena` (~24–25, rows 10–12) |
| Herald apron | south of herald (~11, 13) |
| Altar apron | south of altar (~16, 12) |
| Arena-gate NPC apron | south of arena-gate (~22, 11) |

Spawns / NPCs / transitions object layers in `town.json` must not be deleted when rebuilding collision.

## Where files live

| Asset | Repo path |
|-------|-----------|
| Beauty 1x / @2x / normals | Liberview `public/game/maps/town-painted*.png` |
| Collision | Liberview `public/game/maps/town.json` **and** ether-game `assets/maps/town.json` (sync overwrites Liberview from ether-game) |
| Concept drafts | ether-game `docs/design/maps/*.png` (Pain commits here) |

## Pain tool

`generate_map_image` → commits PNG under `docs/design/maps/<kebab>.png`. For playable work, always call twice: beauty + `<name>-mask`.
