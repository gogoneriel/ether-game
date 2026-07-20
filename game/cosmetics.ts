/** Character look → spritesheet key (public/game/sprites/*.png). */

export type GameCosmetics = {
  body: 'male' | 'female';
  skin: 'light' | 'medium' | 'dark';
  hair: 'brown' | 'black' | 'blond' | 'green';
  outfit: 'tunic' | 'robe' | 'scout';
  weapon: 'none' | 'sword';
  /** @deprecated Ignored — sheet is always computed from body/skin/hair/outfit. */
  sheetKey?: string;
};

export type GameGear = {
  helmet: boolean;
  torso: boolean;
  shoes: boolean;
  weapon: boolean;
};

export const DEFAULT_COSMETICS: GameCosmetics = {
  body: 'male',
  skin: 'light',
  hair: 'green',
  outfit: 'tunic',
  weapon: 'none',
};

export const DEFAULT_GEAR: GameGear = {
  helmet: false,
  torso: false,
  shoes: false,
  weapon: false,
};

const BODY_CODE: Record<GameCosmetics['body'], 'm' | 'f'> = {
  male: 'm',
  female: 'f',
};

/** Normalize stored / partial cosmetics into a full GameCosmetics. */
export function normalizeCosmetics(
  cosmetics?: Partial<GameCosmetics> | null,
): GameCosmetics {
  return {
    body: cosmetics?.body === 'female' ? 'female' : 'male',
    skin:
      cosmetics?.skin === 'medium' || cosmetics?.skin === 'dark'
        ? cosmetics.skin
        : 'light',
    hair:
      cosmetics?.hair === 'brown' ||
      cosmetics?.hair === 'black' ||
      cosmetics?.hair === 'blond' ||
      cosmetics?.hair === 'green'
        ? cosmetics.hair
        : 'green',
    outfit:
      cosmetics?.outfit === 'robe' || cosmetics?.outfit === 'scout'
        ? cosmetics.outfit
        : 'tunic',
    weapon: cosmetics?.weapon === 'sword' ? 'sword' : 'none',
  };
}

/**
 * Resolve spritesheet key from cosmetics + gear.
 * Always recomputes from parts — ignores stale stored `sheetKey`.
 */
export function resolveSheetKey(
  cosmetics?: Partial<GameCosmetics> | null,
  gear?: Partial<GameGear> | null,
): string {
  if (gear?.helmet || gear?.weapon) return 'player-geared';
  const c = normalizeCosmetics(cosmetics);
  return `player-${BODY_CODE[c.body]}-${c.skin}-${c.hair}-${c.outfit}`;
}

export function cosmeticsComplete(
  cosmetics?: Partial<GameCosmetics> | null,
): boolean {
  return Boolean(
    cosmetics?.skin && cosmetics?.hair && cosmetics?.outfit,
  );
}
