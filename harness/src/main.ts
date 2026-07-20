import { createLiberGame } from '@/game/createGame';
import { EventBus, type GameSessionPayload } from '@/game/EventBus';

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
}, 500);

console.info(
  '[ether-game harness] session emitted; multiplayer optional (run server/ separately)',
);
