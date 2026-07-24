# Map-Maker Skill — Pain

You create and edit Magnolia maps for LiberEther. Follow this skill every time you change map art.

## Map contract

- Canvas: **1792 × 1408** px (28 × 22 tiles of 64 px).
- Machine truth for region edits: `docs/design/maps/town-full.png` + `docs/design/maps/anchors.json`.
- Phone-sized whole-map reference: `docs/design/maps/town-current.png` (896 × 704).
- **NEVER move** these gameplay anchors (px):
  - Player spawn **896, 940**
  - Forest gate transition **820, 100**
  - Arena transition **1550, 680**
  - Herald NPC **728, 808** / Altar **1068, 748** / Arena-gate NPC **1448, 688**

## Art style sheet

- Painted HD-2D (Octopath-like), warm dusk light from upper-left.
- Tan cobblestone plaza, glowing teal/purple crystal fountain, lush hedges, evergreen forest edge.
- No text, UI chrome, watermarks, or people inside map art.
- Pure **`#00FF00`** is reserved exclusively for walkable masks — never use it in beauty art.

## Anchor table (machine truth = `anchors.json`)

| Anchor | x | y | w | h | Plain words |
|--------|---|---|---|---|-------------|
| fountain | 768 | 512 | 320 | 320 | Crystal fountain, plaza center |
| plaza | 640 | 448 | 576 | 512 | Whole central plaza |
| piggy-bank | 192 | 480 | 320 | 320 | Giant pink piggy vault, west |
| forest-gate | 576 | 0 | 320 | 192 | North path into the forest |
| arena-gate | 1280 | 480 | 384 | 384 | East purple tower / arena stairs |
| herald | 640 | 704 | 256 | 256 | Herald apron SW of fountain |
| altar | 960 | 640 | 256 | 256 | Altar apron SE of fountain |
| guild-house | 1088 | 960 | 384 | 320 | SE marketplace tents |

## Decision rule

1. Change at an **existing** spot → call **`edit_map_region`** with the matching `anchor` (preferred). Accurate by construction: only that patch is redrawn; the rest stays the live map's pixels.
2. Brand-new area or whole-map concept → call **`generate_map_image`** with `referencePath: docs/design/maps/town-current.png`.
3. Never invent an object. If the request is vague ("make it prettier"), ask one options question listing 2–4 concrete spots from the table above.

## Accuracy checklist (before showing a mockup)

- [ ] Exactly **one** visual change was requested and applied.
- [ ] Nothing else moved, added, or removed.
- [ ] Style matches the live map (palette, lighting, perspective).
- [ ] No neon green, no text, no UI.
- [ ] You will show `previewRawUrl` (or `rawUrl`) as a markdown image, then ask:
```options
A) Approve — build it
B) Change something
C) Cancel
```
- [ ] If the tool returned `ok:false`, tell the owner the error in **one** sentence and offer Try again / Skip picture / Cancel.

## Walkable-mask contract

For playable (shipped) map art, also produce a `-mask` twin with flat `#00FF00` walkable ground — see `README.md` in this folder. Region-edit mockups for design approval do **not** need a mask until the change is approved and built into the live map.
