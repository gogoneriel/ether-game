# Ether Game

Open-source **graphics & content** core for [Ether Game](https://wallet.liberether.com) — a Phaser 3 HD-2D town with realtime multiplayer.

This repository is the **source of truth** for community contributions (maps, sprites, dialogue, FX, multiplayer client/server). Wallet login, SLETH minting, and LiberWallet APIs stay private and are synced in after public review.

## What's here

| Path | Contents |
|------|----------|
| `game/` | Phaser scenes, cosmetics, multiplayer client, FX, dialogue |
| `assets/` | Sprites, tilemaps, audio, card art (`CREDITS.md` for licenses) |
| `server/` | Lightweight WebSocket game server (language rooms, snapshots) |
| `harness/` | Vite shell to run the town **without** a wallet |
| `docs/` | Design docs (guilds, etc.) |
| `scripts/` | Verification suites |

## Quick start (solo / community)

```bash
# 1. Install harness deps
cd harness && npm install && cd ..

# 2. Run the standalone play shell (assets served at /game)
npm run dev
# → open the Vite URL (usually http://localhost:5173)
```

Optional multiplayer (local):

```bash
cd server && npm install
GAME_WS_SECRET=dev-test-secret npm start
# in another terminal, from repo root:
GAME_WS_SECRET=dev-test-secret npm run verify:server
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs that touch wallet, mint, or LiberWallet APIs will be rejected — keep those out of this repo.

## License

- **Code**: [MIT](./LICENSE)
- **Assets**: see [assets/CREDITS.md](./assets/CREDITS.md) (CC0 / LPC / pack-specific terms)

## CI

GitHub Actions workflow template: [docs/ci-workflow.yml](./docs/ci-workflow.yml).
Copy to `.github/workflows/ci.yml` after granting the `workflow` OAuth scope (`gh auth refresh -s workflow`).
