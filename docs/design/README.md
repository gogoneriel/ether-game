# Design docs (phone-first)

This folder is the **source of truth for game design** that Hermes and Cursor Cloud agents read.

## Loop

1. Edit specs here from Obsidian / GitHub mobile
2. Simulate economy in [Machinations](https://machinations.io), paste conclusions into [`economy/machinations-log.md`](economy/machinations-log.md)
3. Discuss with Hermes from the LiberWallet game dashboard (team gate)
4. Prompt a Cursor Cloud agent: `implement <feature> from docs/design/<spec>`
5. Review the PR when back at a keyboard

Hermes on the VPS shallow-clones this repo hourly (and on `/agent/repo/sync`). Design markdown under `docs/` and `docs/design/` is injected into chat at runtime — no container rebuild needed after you push.

## Naming

| Pattern | Use |
|---------|-----|
| `<feature>-spec-vN.md` | Player-facing mechanics / UX specs |
| `economy/<topic>.md` | Tokenomics, SP bank, mint sinks |
| `_TEMPLATE-*.md` | Copy-paste starters (ignore as specs) |

Examples: `sp-bank-spec-v1.md`, `land-sale-spec-v1.md`.

## Existing Phase-1 specs (parent `docs/`)

Still valid; prefer linking them rather than duplicating:

- [`../mechanics-spec-v1.md`](../mechanics-spec-v1.md)
- [`../contracts-design-land-fund.md`](../contracts-design-land-fund.md)
- [`../graphics-gap-report.md`](../graphics-gap-report.md)
- [`../guilds.md`](../guilds.md)

New phone-authored work lives under `docs/design/`.

## Agent entry points

- Codebase map: [`../../graphify-out/wiki/index.md`](../../graphify-out/wiki/index.md) (after Graphify commit)
- Session protocol: [`../SESSION-PROTOCOL.md`](../SESSION-PROTOCOL.md)
- Cursor setup: [`../SETUP-CURSOR.md`](../SETUP-CURSOR.md)
