import { createClient } from '@supabase/supabase-js';
import { checkGameChange, startGameChange } from './cursorAgents.mjs';
import { openIssue, shipPreview, writeDesignDoc } from './github.mjs';
import { generateMapImage } from './images.mjs';
import { listRepoTree, readRepoFile, syncRepo } from './repoSync.mjs';

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'match_overview',
      description:
        'Aggregate recent PvP match telemetry: counts, win rates, avg duration, forfeit rate.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Lookback window in days (default 7, max 90)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'card_win_rates',
      description:
        'Win rates and play counts per card id from game_matches telemetry.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number' },
          limit: { type: 'number', description: 'Max cards to return (default 20)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'action_mix',
      description:
        'Distribution of attack / defend / special actions across recent matches.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_repo_file',
      description:
        'Read a text file from the cloned gogoneriel/ether-game repo (relative path).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path relative to repo root, e.g. docs/README.md',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_repo',
      description: 'List files under a directory in the ether-game clone.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative directory (default root)' },
          depth: { type: 'number', description: 'Depth 0-3 (default 2)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sync_repo_now',
      description: 'Force a shallow git pull of the ether-game repository.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_design_doc',
      description:
        'Commit a markdown design spec under docs/design/ as GitHub user Pain2023 (Pain). Path must be under docs/design/ and end in .md. Always tell the user the commitUrl/fileUrl.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Relative path, e.g. docs/design/sp-bank-spec-v1.md (or bare filename → docs/design/<name>)',
          },
          content: {
            type: 'string',
            description: 'Full markdown file body (max ~30k chars)',
          },
          message: {
            type: 'string',
            description: 'Short commit message (Pain: prefix added if missing)',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_github_issue',
      description:
        'Open a GitHub issue on gogoneriel/ether-game as Pain2023. Always tell the user the issue url.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string', description: 'Markdown issue body' },
          labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional labels (must already exist on the repo)',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_game_change',
      description:
        'Launch a Cursor Cloud agent that codes the owner request onto the LiberWallet `pain` preview branch (pain.liberether.com). Only one running change at a time. Always share agentUrl + previewUrl with the owner.',
      parameters: {
        type: 'object',
        properties: {
          request: {
            type: 'string',
            description: 'Plain-language description of the game change to implement',
          },
          specPath: {
            type: 'string',
            description:
              'Optional path to a design doc already saved (e.g. docs/design/town-fountain-spec-v1.md)',
          },
          repo: {
            type: 'string',
            description: 'liberview (default) or ether-game',
          },
        },
        required: ['request'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_game_change',
      description:
        'Check status of a Cursor Cloud agent started by start_game_change. When finished, tell the owner to open https://pain.liberether.com.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Agent id (bc-...). Optional if one was just started.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ship_preview',
      description:
        'Open a GitHub PR from LiberWallet branch `pain` into `main` so the owner can merge the public Pain preview into production. Idempotent if a PR already exists. Never merge. Always share the prUrl.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Optional PR title',
          },
          body: {
            type: 'string',
            description: 'Optional PR body markdown',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_map_image',
      description:
        'Generate a map/concept image with Gemini and commit it to ether-game under docs/design/maps/<name>.png. For playable-map work ALWAYS produce two images: beauty (<name>) and walkable mask (<name>-mask) with flat #00FF00 walkable ground per docs/design/maps/README.md. Reply with markdown images using the rawUrl values.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Image generation prompt',
          },
          name: {
            type: 'string',
            description: 'Kebab-case filename without .png (e.g. magnolia-plaza-v2)',
          },
          referencePath: {
            type: 'string',
            description:
              'Optional path inside the ether-game clone to use as a reference image (e.g. docs/design/maps/town-ref.png)',
          },
        },
        required: ['prompt', 'name'],
      },
    },
  },
];

function sinceIso(days) {
  const d = Math.min(90, Math.max(1, Number(days) || 7));
  const ms = Date.now() - d * 24 * 60 * 60 * 1000;
  return { days: d, iso: new Date(ms).toISOString() };
}

async function fetchMatches(days) {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, error: 'supabase_not_configured', matches: [] };
  }
  const { days: d, iso } = sinceIso(days);
  const { data, error } = await sb
    .from('game_matches')
    .select(
      'id,created_at,winner_side,winner_address,turns,duration_sec,forfeit,player_a,player_b,hand_a,hand_b,guild_a,guild_b,actions,damage_a,damage_b',
    )
    .gte('created_at', iso)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    return { ok: false, error: error.message, matches: [], days: d };
  }
  return { ok: true, matches: data || [], days: d };
}

function parseActions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function handIds(hand) {
  if (!Array.isArray(hand)) return [];
  return hand
    .map((c) => (typeof c === 'string' ? c : c?.id))
    .filter((id) => typeof id === 'string' && id.length > 0);
}

export async function runTool(name, args = {}) {
  switch (name) {
    case 'match_overview': {
      const { ok, error, matches, days } = await fetchMatches(args.days);
      if (!ok) return { ok, error, days };
      const forfeits = matches.filter((m) => m.forfeit).length;
      const durations = matches
        .map((m) => Number(m.duration_sec))
        .filter((n) => Number.isFinite(n) && n >= 0);
      const avgDuration =
        durations.length > 0
          ? Math.round(
              durations.reduce((a, b) => a + b, 0) / durations.length,
            )
          : null;
      const turns = matches
        .map((m) => Number(m.turns))
        .filter((n) => Number.isFinite(n));
      const avgTurns =
        turns.length > 0
          ? Math.round((turns.reduce((a, b) => a + b, 0) / turns.length) * 10) /
            10
          : null;
      return {
        ok: true,
        days,
        sample: matches.length,
        forfeits,
        forfeitRate:
          matches.length > 0
            ? Math.round((forfeits / matches.length) * 1000) / 1000
            : null,
        avgDurationSec: avgDuration,
        avgTurns,
      };
    }
    case 'card_win_rates': {
      const { ok, error, matches, days } = await fetchMatches(args.days);
      if (!ok) return { ok, error, days };
      const limit = Math.min(50, Math.max(5, Number(args.limit) || 20));
      /** @type {Map<string, { plays: number, wins: number }>} */
      const stats = new Map();
      for (const m of matches) {
        const aCards = handIds(m.hand_a);
        const bCards = handIds(m.hand_b);
        if (m.guild_a?.id) aCards.push(m.guild_a.id);
        if (m.guild_b?.id) bCards.push(m.guild_b.id);
        const aWin = m.winner_side === 'a';
        const bWin = m.winner_side === 'b';
        for (const id of new Set(aCards)) {
          const row = stats.get(id) || { plays: 0, wins: 0 };
          row.plays += 1;
          if (aWin) row.wins += 1;
          stats.set(id, row);
        }
        for (const id of new Set(bCards)) {
          const row = stats.get(id) || { plays: 0, wins: 0 };
          row.plays += 1;
          if (bWin) row.wins += 1;
          stats.set(id, row);
        }
      }
      const ranked = [...stats.entries()]
        .map(([id, s]) => ({
          cardId: id,
          plays: s.plays,
          wins: s.wins,
          winRate: s.plays ? Math.round((s.wins / s.plays) * 1000) / 1000 : 0,
        }))
        .sort((a, b) => b.plays - a.plays || b.winRate - a.winRate)
        .slice(0, limit);
      return { ok: true, days, sample: matches.length, cards: ranked };
    }
    case 'action_mix': {
      const { ok, error, matches, days } = await fetchMatches(args.days);
      if (!ok) return { ok, error, days };
      const counts = { attack: 0, defend: 0, special: 0, other: 0 };
      let total = 0;
      for (const m of matches) {
        for (const act of parseActions(m.actions)) {
          const a = (act?.action || act?.type || '').toLowerCase();
          if (a === 'attack' || a === 'defend' || a === 'special') {
            counts[a] += 1;
          } else {
            counts.other += 1;
          }
          total += 1;
        }
      }
      const pct = (n) =>
        total ? Math.round((n / total) * 1000) / 1000 : 0;
      return {
        ok: true,
        days,
        sampleMatches: matches.length,
        totalActions: total,
        counts,
        rates: {
          attack: pct(counts.attack),
          defend: pct(counts.defend),
          special: pct(counts.special),
          other: pct(counts.other),
        },
      };
    }
    case 'read_repo_file':
      return readRepoFile(args.path);
    case 'list_repo':
      return listRepoTree(args.path || '', Math.min(3, Number(args.depth) || 2));
    case 'sync_repo_now':
      return syncRepo();
    case 'write_design_doc':
      return writeDesignDoc(args);
    case 'open_github_issue':
      return openIssue(args);
    case 'start_game_change':
      return startGameChange(args);
    case 'check_game_change':
      return checkGameChange(args);
    case 'ship_preview':
      return shipPreview(args);
    case 'generate_map_image':
      return generateMapImage(args);
    default:
      return { ok: false, error: `unknown_tool:${name}` };
  }
}

/** Deterministic balance report used by GET /agent/report/balance */
export async function buildBalanceReport(days = 7) {
  const overview = await runTool('match_overview', { days });
  const cards = await runTool('card_win_rates', { days, limit: 15 });
  const mix = await runTool('action_mix', { days });
  return {
    generatedAt: new Date().toISOString(),
    overview,
    cardWinRates: cards,
    actionMix: mix,
    notes:
      overview?.sample === 0
        ? 'No matches logged yet — play PvP duels after telemetry deploy, then re-run.'
        : 'Interpret win rates with sample size; prefer patches when plays ≥ 20.',
  };
}
