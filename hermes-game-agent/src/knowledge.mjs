import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PACK = join(__dirname, '..', 'knowledge', 'pack.md');

let cached = { path: '', text: '', mtime: 0 };

export function loadKnowledgePack() {
  const path = (process.env.KNOWLEDGE_PACK_PATH || DEFAULT_PACK).trim();
  try {
    if (!existsSync(path)) {
      return {
        path,
        text: FALLBACK_PACK,
        truncated: false,
        missing: true,
      };
    }
    const statMtime = 0;
    if (cached.path === path && cached.text && cached.mtime === statMtime) {
      return { path, text: cached.text, truncated: false, missing: false };
    }
    let text = readFileSync(path, 'utf8');
    const max = Number(process.env.KNOWLEDGE_MAX_CHARS || 120_000);
    let truncated = false;
    if (text.length > max) {
      text = `${text.slice(0, max)}\n\n…[knowledge pack truncated at ${max} chars]`;
      truncated = true;
    }
    cached = { path, text, mtime: statMtime };
    return { path, text, truncated, missing: false };
  } catch (err) {
    return {
      path,
      text: `${FALLBACK_PACK}\n\n(load error: ${err?.message || err})`,
      truncated: false,
      missing: true,
    };
  }
}

const FALLBACK_PACK = `# Hermes knowledge pack (fallback)

## Card economy
- Mint: exactly 1 SLETH. Odds 60% bronze / 30% silver / 10% gold.
- 10% treasury / 90% locked until unmint.

## Battle loop
- Actions: attack | defend | special.
- Guild card: at most one per match; signature ATK ×1.25; once (except defend).
- Timer default 30s; timeout → auto Defend.

## Visual north star
- Magnolia Arena HD-2D: sunset city, rune circle platform, ornate bottom tray, ATK/DEF/SPECIAL buttons, elemental cards with ATK/DEF/SP + stars.

## Contracts (design / undeployed)
- LiberCards.sol coded+tested, NEXT_PUBLIC_LIBER_CARDS_ADDRESS empty.
- Land NFT + MagnoliaCityFund + loyalty redistribute: design only.
`;
