# <Feature name> — spec v1

> Copy this file to `<feature>-spec-v1.md` and fill every section.

## Goal

One paragraph: what the player feels / unlocks, and why it matters for LiberEther.

## Player loop

1. Trigger / entry point
2. Core actions (buttons, taps, cooldowns)
3. Feedback (UI, SFX, points)
4. Exit / reward

## Economy hooks (SLETH / LiberPass)

- Mint / unmint / burn interactions (if any)
- SP, loyalty, or membership gates
- Magnolia City Fund touchpoints (fees, redistribute)

## Machinations conclusions

Link or paste from [`economy/machinations-log.md`](economy/machinations-log.md):

- Diagram URL:
- Parameters tested:
- Verdict (sustainable / stalls / exploit risk):

## Acceptance criteria

- [ ] …
- [ ] …
- [ ] Telemetry events defined (if multiplayer / duel)

## Out of scope

Explicit non-goals for this version.

## Cloud-agent prompt

Paste into Cursor Cloud / mobile agents:

```
Implement <feature> from docs/design/<feature>-spec-v1.md.
Start at graphify-out/wiki/index.md for codebase structure.
Do not change undeployed contract addresses. Open a PR with a short summary.
```
