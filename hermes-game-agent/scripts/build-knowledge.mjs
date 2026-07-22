/**
 * Compiles Hermes knowledge pack from LiberWallet / ether-game sources.
 * Run from repo root: node server/hermes-game-agent/scripts/build-knowledge.mjs
 * Or from this package: npm run build:knowledge
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentRoot = resolve(__dirname, '..');
const liberRoot = resolve(agentRoot, '..', '..');

const sources = [
  {
    title: 'Guild design',
    path: 'docs/ether-game/guilds.md',
    max: 12_000,
  },
  {
    title: 'Tale of Liber agent notes',
    path: 'docs/tale-of-liber-agent.md',
    max: 14_000,
  },
  {
    title: 'Game audit R1',
    path: 'docs/game-audit-liberwallet-r1.md',
    max: 16_000,
  },
  {
    title: 'Card catalog (JSON)',
    path: 'src/game/cards/catalog.json',
    max: 40_000,
  },
  {
    title: 'Card odds / mint economy',
    path: 'src/lib/game/cardOdds.ts',
    max: 4_000,
  },
  {
    title: 'Client turn machine',
    path: 'src/game/battle/turnMachine.ts',
    max: 20_000,
  },
  {
    title: 'Server duel engine',
    path: 'server/game/duelEngine.mjs',
    max: 20_000,
  },
];

const skillSnippets = [
  {
    title: 'Skill: game-content-systems (condensed)',
    text: `Dialogue as TS modules under src/game/dialogue/. Pause town input during dialogue.
Audio under public/game/audio/; mute via EventBus audio:mute + localStorage liber-game-mute.
Game feel: interact pulse, map fade 200–400ms, NPC bounce. No heavy post-FX; pixelArt true.
Chat is React overlay (not Phaser input). Sanitize, max 200 chars, rate-limit.`,
  },
  {
    title: 'Skill: hd2d-phaser-fx (condensed)',
    text: `HD-2D: Light2D + normal maps, bloom/tilt-shift/vignette optional, day-night, drop shadows, particles, parallax clouds. Quality tiers high/lite. Prefer under src/game/fx or WorldScene lighting.`,
  },
  {
    title: 'Skill: pixel-art-pipeline (condensed)',
    text: `CC0/LPC workflow: Kenney + OpenGameArt, Universal LPC sheets, atlas packing, CREDITS.md licenses. Card art and arena characters follow same pipeline.`,
  },
];

const targetImages = `
# Target image briefs (visual north star)

## Image A — Prototype (current-ish)
Mobile PvP: "Live PvP • Magnolia Arena", timer, spectators. Dual HP bars. Simple yellow/green cards in blue oval arena. Bottom hand with Sprout Runner / Reserve Keeper. Buttons ATTACK / DEFEND / SPECIAL. Dark purple→orange gradient. Functional prototype, not final art.

## Image B — Mid fidelity HD-2D
Sunset arena, fantasy city with domes, glowing green runes on stone circle. Winged gold warrior vs green hooded rogue. Ornate gold-bordered wooden tray. Cards with ATK/DEF/SP color boxes. Log: "neriel played Defend +4". CRT-ish pixel lighting.

## Image C — High fidelity mock (cards in tray)
PvP Duel • Magnolia Arena. Libertador vs EtherKnight. Vault Phoenix (winged) vs Sprout Runner. Active card Frost Slash with ice VFX. Bottom tray: Sunflare Drake / Aqua Sentinel / Forest Guardian with elemental borders, ATK DEF SP + stars. Legendary Unicorns special slot. Deck backs. Spectators: 6.

## Image D — High fidelity with action buttons
Same arena fantasy. Large gold-filigree ATTACK (red/sword) DEFEND (blue/shield) SPECIAL (green/star) buttons above hand. Cards Sunflare Drake + Aqua Sentinel. Scroll prompt "Your turn — Choose: Attack • Defend • Special".

## Gap vs current build
Need: cinematic arena backdrop, character battle sprites (not placeholder cards-only), ornate UI tray, icon buttons, elemental card frames, particle VFX for plays, spectator/timer chrome polish, remove prototype blockiness.
`;

function readCapped(abs, max) {
  if (!existsSync(abs)) return null;
  let text = readFileSync(abs, 'utf8');
  if (text.length > max) {
    text = `${text.slice(0, max)}\n\n…[truncated at ${max} chars]`;
  }
  return text;
}

const parts = [];
parts.push(`# Hermes Game Architect — knowledge pack`);
parts.push(`Generated: ${new Date().toISOString()}`);
parts.push(`Liber root: ${liberRoot}`);
parts.push(targetImages.trim());

for (const s of skillSnippets) {
  parts.push(`\n## ${s.title}\n\n${s.text}`);
}

for (const src of sources) {
  const abs = join(liberRoot, src.path);
  const body = readCapped(abs, src.max);
  if (!body) {
    parts.push(`\n## ${src.title}\n\n_(missing: ${src.path})_`);
    continue;
  }
  parts.push(`\n## ${src.title}\n\nPath: \`${src.path}\`\n\n\`\`\`\n${body}\n\`\`\``);
}

parts.push(`
## Product constraints (tokenomics — design only, no deploys in Phase 1)

- LiberCards: ERC-721, 1 SLETH mint, voucher rarity/stats, unmint refund of locked SLETH. Coded+tested; address env empty.
- SLETH address (Arbitrum): 0x4064BFC0c404bE8F472bac81934714b2d2043869 — verify before any onchain work.
- Future: Land NFT sales; MagnoliaCityFund receives proceeds; redistribute by loyalty points; LiberPass membership + referrals grow loyalty.
- Guild NFT mint (guild token + 1 SLETH tier) — design doc only.
`);

const outDir = join(agentRoot, 'knowledge');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'pack.md');
writeFileSync(outPath, parts.join('\n'), 'utf8');
console.log(`Wrote ${outPath} (${parts.join('\n').length} chars)`);
