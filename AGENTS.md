# Agent guide — Ether Game

## Start here

1. **Codebase map:** [`graphify-out/wiki/index.md`](graphify-out/wiki/index.md)
2. **Architecture summary:** [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md)
3. **Design source of truth:** [`docs/design/`](docs/design/) — phone-editable specs Hermes + Cloud agents read
4. Session protocol: [`docs/SESSION-PROTOCOL.md`](docs/SESSION-PROTOCOL.md)
5. Progress: [`docs/PROGRESS.md`](docs/PROGRESS.md) · Roadmap: [`docs/production-roadmap.md`](docs/production-roadmap.md)

Prefer `graphify query` / `path` / `explain` before broad Grep when the graph exists (see `.cursor/rules/graphify.mdc`).

## Design → implement loop

1. Specs land in `docs/design/<feature>-spec-vN.md` (template: `docs/design/_TEMPLATE-feature-spec.md`)
2. Economy sims: paste Machinations conclusions into `docs/design/economy/machinations-log.md`
3. Hermes (LiberWallet dashboard, team gate) reads live `docs/` after git sync
4. Cloud agent prompt example:

```
Implement SP bank from docs/design/<spec> (or docs/mechanics-spec-v1.md).
Start at graphify-out/wiki/index.md for codebase structure.
Keep LiberWallet card shape: ATK/DEF/SP, bronze|silver|gold, max 1 guild card.
Run npm run typecheck && npm run test:unit. Open a PR.
```

## Phase-1 specs (also under `docs/`)

- [`docs/mechanics-spec-v1.md`](docs/mechanics-spec-v1.md)
- [`docs/contracts-design-land-fund.md`](docs/contracts-design-land-fund.md)
- [`docs/graphics-gap-report.md`](docs/graphics-gap-report.md)
- [`docs/guilds.md`](docs/guilds.md)

## Boundaries

- This repo is the Phaser game client/server game logic — no wallet/mint product code.
- Art targets: [`docs/art-targets/`](docs/art-targets/)
- Sibling LiberWallet repo deploys Hermes + dashboard shell.
