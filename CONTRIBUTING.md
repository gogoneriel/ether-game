# Contributing to Ether Game

Thanks for helping build the open town. This repo is for **game graphics, content, and multiplayer core** only.

## Do contribute

- Maps (`assets/maps`), tilesets, sprites, audio
- Phaser scenes / FX / dialogue scripts under `game/`
- Multiplayer client (`game/multiplayer`) and `server/` improvements
- Docs under `docs/`
- Unit / integration scripts under `scripts/`

## Do not contribute here

- Wallet SDKs (Privy, Account Kit, Alchemy Smart Wallets)
- SLETH / guild token mint contracts or voucher signers
- LiberWallet session cookies, Supabase schema, or `/api/game/*` routes
- Production deploy secrets / VPS deploy scripts

Those adapters live in the private LiberWallet app and are pulled in after community review via a sync script.

## Workflow

1. Fork and branch from `main`
2. Run the harness: `cd harness && npm install && npm run dev`
3. Keep changes focused; prefer CC0/LPC-compatible assets and update `assets/CREDITS.md`
4. Run checks before opening a PR:

```bash
npm run test:unit
# if you touched the server:
cd server && npm install && GAME_WS_SECRET=dev-test-secret npm start &
GAME_WS_SECRET=dev-test-secret npm run verify:server
```

5. Open a PR describing gameplay/visual impact

## Code style

- TypeScript strict for `game/`
- Prefer small, reviewable PRs
- No secrets in the tree (use env vars)
