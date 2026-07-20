import type { GameCosmetics, GameGear } from '@/game/cosmetics';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (...args: any[]) => void;

/** Minimal browser-safe EventEmitter (no Node `events` dependency). */
class TinyEmitter {
  private listeners = new Map<string | symbol, Set<Handler>>();

  on(event: string | symbol, handler: Handler): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return this;
  }

  once(event: string | symbol, handler: Handler): this {
    const wrap: Handler = (...args) => {
      this.off(event, wrap);
      handler(...args);
    };
    return this.on(event, wrap);
  }

  off(event: string | symbol, handler: Handler): this {
    this.listeners.get(event)?.delete(handler);
    return this;
  }

  removeListener(event: string | symbol, handler: Handler): this {
    return this.off(event, handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string | symbol, ...args: any[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    for (const handler of [...set]) handler(...args);
    return true;
  }

  setMaxListeners(_n: number): this {
    return this;
  }
}

/** Shared React ↔ Phaser bus (module singleton). */
export const EventBus = new TinyEmitter();

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
