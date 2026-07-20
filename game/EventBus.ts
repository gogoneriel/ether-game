import { EventEmitter } from 'events';
import type { GameCosmetics, GameGear } from '@/game/cosmetics';

/** Shared React ↔ Phaser bus (module singleton). */
export const EventBus = new EventEmitter();

export type GameFacing = 'up' | 'down' | 'left' | 'right';
export type GameMapKey = 'town' | 'forest';

export type GameSessionPayload = {
  address: string;
  displayName: string;
  isTeam: boolean;
  isDevWallet: boolean;
  isGuest: boolean;
  cosmetics?: GameCosmetics;
  gear?: GameGear;
  map?: GameMapKey;
};

export type PlayerMovePayload = {
  address: string;
  displayName?: string;
  x: number;
  y: number;
  facing: GameFacing;
  map?: GameMapKey;
  sheetKey?: string;
  ts?: number;
};

export type RemotePlayerPayload = {
  address: string;
  displayName: string;
  x: number;
  y: number;
  facing: GameFacing;
  map?: GameMapKey;
  sheetKey?: string;
  ts?: number;
};

export type CompanionSpeakPayload = {
  speaking: boolean;
};

export type ChatMessagePayload = {
  address: string;
  displayName: string;
  text: string;
  ts: number;
};

export type DialogueOpenPayload = {
  scriptId: string;
};

export type QuestTalkPayload = {
  npcId: string;
};

/** Relative zoom step from UI (+1 / -1) or absolute via camera:zoom-set. */
export type CameraZoomDeltaPayload = {
  delta: number;
};
