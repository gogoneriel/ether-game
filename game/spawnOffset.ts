import { TILE } from '@/game/townMap';

/** Deterministic ±1-tile offset so two players never stack at the same spawn pixel. */
export function spawnOffsetForAddress(address: string): { dx: number; dy: number } {
  let h = 0;
  const a = address.toLowerCase();
  for (let i = 0; i < a.length; i++) {
    h = (h * 31 + a.charCodeAt(i)) >>> 0;
  }
  const slots: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
  ];
  const [tx, ty] = slots[h % slots.length]!;
  return { dx: tx * TILE, dy: ty * TILE };
}

/** Default plaza spawn used before the tilemap object layer is known. */
export const DEFAULT_TOWN_SPAWN = {
  x: 14 * TILE + 32,
  y: 9 * TILE + 32,
};

export function spawnPointForAddress(
  address: string,
  baseX = DEFAULT_TOWN_SPAWN.x,
  baseY = DEFAULT_TOWN_SPAWN.y,
): { x: number; y: number } {
  const { dx, dy } = spawnOffsetForAddress(address);
  return { x: baseX + dx, y: baseY + dy };
}
