# Ether Game assets

## Generated Liber HD-2D placeholders

64×64 tilesets, walk sheets, normal maps (`*-n.png`), FX textures, and WAV stubs
were produced by `scripts/generate-game-assets.mjs`.

```bash
npm run generate:game-assets
```

## Layout contract

- Tileset `liber-town.png`: **8×2** (16) tiles at **64×64** (+ `liber-town-n.png`) — procedural fallback terrain
- Tileset `sonetto-town.png`: **8×70** (560) tiles at **64×64** (+ `sonetto-town-n.png`) — upscaled from 32×32 source
- Walk sheets: 4×4 frames at **64×64** (rows: down, left, right, up)
- FX: `sprites/fx/{soft,firefly,leaf,cloud}.png`
- Maps: Tiled JSON under `maps/` — tile size 64, layers `ground` + `deco`

## Replace with external packs

| Asset | Suggested source | License |
|-------|------------------|---------|
| Town / forest tiles | Sonetto Commons (below) / [Kenney.nl](https://kenney.nl/) | CC-BY-SA 4.0 / CC0 |
| Character sheets | [Universal LPC Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) | CC-BY-SA 3.0 |
| SFX / UI | Kenney Interface / RPG Audio | CC0 |

## Third-party attributions

- **Exterior 32x32 Town tileset** by Arthur Carvalho, CC-BY-SA 4.0.
  https://opengameart.org/content/exterior-32x32-town-tileset
  https://fb.com/sonettocommons
  Copyright 2017, 2018 Guilherme Vieira.
  Source: `scripts/assets/tileset_town_multi_v002.png` → `public/game/tilesets/sonetto-town.png` (2× nearest-neighbor + generated normals).
