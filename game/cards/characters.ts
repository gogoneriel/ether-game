import type { CardRarity } from '@/game/cards/types';

export type LiberCharacterTemplate = {
  slug: string;
  name: string;
  rarity: CardRarity;
  blurb: string;
};

export type { CardRarity };

export const LIBER_CHARACTERS: LiberCharacterTemplate[] = [
  {
    slug: 'sprout-runner',
    name: 'Sprout Runner',
    rarity: 'bronze',
    blurb: 'A quick courier of the Liber plaza.',
  },
  {
    slug: 'ledger-scribe',
    name: 'Ledger Scribe',
    rarity: 'bronze',
    blurb: 'Keeps the town tallies honest.',
  },
  {
    slug: 'path-warden',
    name: 'Path Warden',
    rarity: 'silver',
    blurb: 'Guards the routes between vault and vote.',
  },
  {
    slug: 'reserve-keeper',
    name: 'Reserve Keeper',
    rarity: 'silver',
    blurb: 'Watches the SLETH redemption wells.',
  },
  {
    slug: 'emerald-herald',
    name: 'Emerald Herald',
    rarity: 'gold',
    blurb: 'Voice of Liber governance under the canopy.',
  },
  {
    slug: 'vault-phoenix',
    name: 'Vault Phoenix',
    rarity: 'gold',
    blurb: 'Rises whenever the treasury is tested.',
  },
];

export function pickCharacter(
  rarity: CardRarity,
  seedHex: string,
): LiberCharacterTemplate {
  const pool = LIBER_CHARACTERS.filter((c) => c.rarity === rarity);
  const idx =
    parseInt(seedHex.slice(10, 14) || '0', 16) % Math.max(pool.length, 1);
  return pool[idx] ?? pool[0] ?? LIBER_CHARACTERS[0];
}
