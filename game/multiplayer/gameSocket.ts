import type {
  ChatMessagePayload,
  GameFacing,
  GameMapKey,
} from '@/game/EventBus';

export type GameLang = 'en' | 'pt' | 'es' | 'de' | 'fr';

export type RosterPlayer = {
  address: string;
  displayName: string;
  sheetKey?: string;
  map?: GameMapKey;
  x: number;
  y: number;
  facing: GameFacing;
};

export type SnapPlayer = RosterPlayer & { ts?: number };

export type GameSocketHandlers = {
  onWelcome?: (payload: {
    selfId: string;
    lang: GameLang;
    online: number;
    roster: RosterPlayer[];
  }) => void;
  onSnapshot?: (payload: {
    ts: number;
    online: number;
    players: SnapPlayer[];
  }) => void;
  onJoin?: (player: RosterPlayer) => void;
  onLeave?: (address: string) => void;
  onChat?: (msg: ChatMessagePayload) => void;
  onOnline?: (online: number) => void;
  onError?: (code: string, message: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export type JoinIdentity = {
  name: string;
  sheetKey: string;
  map: GameMapKey;
  lang: GameLang;
  x: number;
  y: number;
  facing: GameFacing;
};

type TokenResp = { token: string; url: string; address: string };

async function fetchToken(): Promise<TokenResp> {
  const res = await fetch('/api/game/ws-token', { cache: 'no-store' });
  if (!res.ok) throw new Error(`ws-token ${res.status}`);
  return (await res.json()) as TokenResp;
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private handlers: GameSocketHandlers;
  private identity: JoinIdentity;
  private closed = false;
  private backoffMs = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private joined = false;

  constructor(identity: JoinIdentity, handlers: GameSocketHandlers) {
    this.identity = identity;
    this.handlers = handlers;
  }

  updateIdentity(partial: Partial<JoinIdentity>) {
    this.identity = { ...this.identity, ...partial };
    if (this.ws?.readyState === WebSocket.OPEN && this.joined) {
      this.send({
        t: 'identity',
        name: this.identity.name,
        sheetKey: this.identity.sheetKey,
      });
    }
  }

  connect() {
    this.closed = false;
    void this.open();
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'client');
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
    this.joined = false;
  }

  sendMove(payload: {
    x: number;
    y: number;
    facing: GameFacing;
    map?: GameMapKey;
    sheetKey?: string;
    name?: string;
  }) {
    // Keep identity in sync so reconnect join carries the live position.
    this.identity.x = payload.x;
    this.identity.y = payload.y;
    this.identity.facing = payload.facing;
    if (payload.map) this.identity.map = payload.map;
    if (payload.sheetKey) this.identity.sheetKey = payload.sheetKey;
    if (payload.name) this.identity.name = payload.name;
    this.send({
      t: 'move',
      x: payload.x,
      y: payload.y,
      facing: payload.facing,
      map: payload.map ?? this.identity.map,
      sheetKey: payload.sheetKey ?? this.identity.sheetKey,
      name: payload.name ?? this.identity.name,
    });
  }

  sendChat(text: string) {
    this.send({ t: 'chat', text });
  }

  switchRoom(lang: GameLang) {
    this.identity.lang = lang;
    this.send({ t: 'switch', lang });
  }

  private async open() {
    if (this.closed) return;
    let tokenResp: TokenResp;
    try {
      tokenResp = await fetchToken();
    } catch (err) {
      this.handlers.onError?.('token', String(err));
      this.scheduleReconnect();
      return;
    }

    if (this.closed) return;

    try {
      const ws = new WebSocket(tokenResp.url);
      this.ws = ws;

      ws.onopen = () => {
        this.backoffMs = 1000;
        this.handlers.onOpen?.();
        this.send({
          t: 'join',
          token: tokenResp.token,
          name: this.identity.name,
          sheetKey: this.identity.sheetKey,
          map: this.identity.map,
          lang: this.identity.lang,
          x: this.identity.x,
          y: this.identity.y,
          facing: this.identity.facing,
        });
      };

      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        this.handleMessage(msg);
      };

      ws.onclose = () => {
        this.joined = false;
        this.handlers.onClose?.();
        if (!this.closed) this.scheduleReconnect();
      };

      ws.onerror = () => {
        /* onclose will reconnect */
      };
    } catch (err) {
      this.handlers.onError?.('connect', String(err));
      this.scheduleReconnect();
    }
  }

  private handleMessage(msg: Record<string, unknown>) {
    const t = msg.t;
    if (t === 'welcome') {
      this.joined = true;
      this.handlers.onWelcome?.({
        selfId: String(msg.selfId ?? ''),
        lang: (msg.lang as GameLang) || this.identity.lang,
        online: Number(msg.online ?? 0),
        roster: (msg.roster as RosterPlayer[]) ?? [],
      });
      this.handlers.onOnline?.(Number(msg.online ?? 0));
      return;
    }
    if (t === 'snap') {
      this.handlers.onSnapshot?.({
        ts: Number(msg.ts ?? Date.now()),
        online: Number(msg.online ?? 0),
        players: (msg.players as SnapPlayer[]) ?? [],
      });
      this.handlers.onOnline?.(Number(msg.online ?? 0));
      return;
    }
    if (t === 'join' && msg.player) {
      this.handlers.onJoin?.(msg.player as RosterPlayer);
      return;
    }
    if (t === 'leave') {
      this.handlers.onLeave?.(String(msg.address ?? ''));
      return;
    }
    if (t === 'chat') {
      this.handlers.onChat?.({
        address: String(msg.address ?? ''),
        displayName: String(msg.displayName ?? ''),
        text: String(msg.text ?? ''),
        ts: Number(msg.ts ?? Date.now()),
      });
      return;
    }
    if (t === 'error') {
      this.handlers.onError?.(
        String(msg.code ?? 'error'),
        String(msg.message ?? ''),
      );
    }
  }

  private send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 10_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.open();
    }, delay);
  }
}

export const GAME_LANGS: GameLang[] = ['en', 'pt', 'es', 'de', 'fr'];

export const LANG_FLAGS: Record<GameLang, string> = {
  en: '🇺🇸',
  pt: '🇧🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  fr: '🇫🇷',
};

export function localeToGameLang(locale: string): GameLang {
  const l = locale.toLowerCase().slice(0, 2);
  if (l === 'pt' || l === 'es' || l === 'de' || l === 'fr' || l === 'en') {
    return l;
  }
  return 'en';
}
