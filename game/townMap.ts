/** Shared tile size. Maps load from Tiled JSON (64px HD-2D). */
export const TILE = 64;

export type NpcDef = {
  id: string;
  texture: string;
  x: number;
  y: number;
  label: string;
  event: string;
  dialogueId?: string;
};
