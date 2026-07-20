import { createLiberGame } from '@/game/createGame';
import { EventBus, type GameSessionPayload } from '@/game/EventBus';
import { GameSocket } from '@/game/multiplayer/gameSocket';
import { resolveSheetKey } from '@/game/cosmetics';

/** Guest identity for local content work (not a LiberWallet session). */
const GUEST_SESSION: GameSessionPayload = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  displayName: 'Guest',
  isTeam: false,
  isDevWallet: true,
  isGuest: true,
  map: 'town',
  cosmetics: {
    body: 'male',
    skin: 'light',
    hair: 'brown',
    outfit: 'tunic',
    weapon: 'none',
  },
};

const parent = document.getElementById('game-root');
if (!parent) throw new Error('#game-root missing');

createLiberGame({ parent });

// WorldScene listens for game:session after boot.
window.setTimeout(() => {
  EventBus.emit('game:session', GUEST_SESSION);

  // Optional multiplayer: needs `cd server && GAME_WS_SECRET=dev-test-secret npm start`
  const enableMp = import.meta.env.VITE_ENABLE_MULTIPLAYER === '1';
  if (!enableMp) {
    console.info(
      '[ether-game harness] solo mode — set VITE_ENABLE_MULTIPLAYER=1 + run server/ for WS',
    );
    return;
  }

  const sheetKey = resolveSheetKey(GUEST_SESSION.cosmetics);
  const socket = new GameSocket(
    {
      name: GUEST_SESSION.displayName,
      sheetKey,
      map: 'town',
      lang: 'en',
      x: 928,
      y: 608,
      facing: 'down',
    },
    {
      onWelcome: (w) => {
        console.info('[harness] welcome online=', w.online);
        EventBus.emit('multiplayer:roster', w.roster);
      },
      onSnapshot: (s) => EventBus.emit('multiplayer:snap', s),
      onJoin: (p) => EventBus.emit('multiplayer:join', p),
      onLeave: (a) => EventBus.emit('multiplayer:leave', a),
      onError: (code, message) =>
        console.warn('[harness] socket error', code, message),
    },
  );
  socket.connect();

  EventBus.on(
    'player:local-move',
    (payload: {
      x: number;
      y: number;
      facing: 'up' | 'down' | 'left' | 'right';
      map?: 'town' | 'forest';
      sheetKey?: string;
    }) => {
      socket.sendMove(payload);
    },
  );
}, 500);

console.info('[ether-game harness] booting Phaser…');
