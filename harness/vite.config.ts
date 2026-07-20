import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');

const DEV_SECRET = process.env.GAME_WS_SECRET || 'dev-test-secret';
const DEV_WS_URL = process.env.GAME_WS_URL || 'ws://127.0.0.1:8080/ws';
const DEV_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function mimeFor(filePath: string): string {
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.wav')) return 'audio/wav';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

function signGameToken(address: string, secret: string, ttlMs = 5 * 60 * 1000) {
  const addr = address.toLowerCase();
  const exp = String(Date.now() + ttlMs);
  const payload = `${addr}.${exp}`;
  const hmac = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

/** Serve ../assets at /game/* so Phaser load paths stay unchanged. */
function serveGameAssets(): Plugin {
  return {
    name: 'serve-game-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/game/')) return next();
        const rel = decodeURIComponent(
          req.url.slice('/game'.length).split('?')[0] || '/',
        );
        const filePath = path.normalize(path.join(assetsDir, rel));
        if (!filePath.startsWith(assetsDir)) return next();
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', mimeFor(filePath));
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

/**
 * Dev-only LiberWallet-compatible token endpoint so GameSocket can join a
 * local server started with GAME_WS_SECRET=dev-test-secret.
 */
function gameWsTokenStub(): Plugin {
  return {
    name: 'game-ws-token-stub',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (url !== '/api/game/ws-token') return next();
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('method not allowed');
          return;
        }
        const body = JSON.stringify({
          token: signGameToken(DEV_ADDRESS, DEV_SECRET),
          url: DEV_WS_URL,
          address: DEV_ADDRESS,
        });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(body);
      });
    },
  };
}

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@/game': path.resolve(root, 'game'),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [root] },
  },
  publicDir: false,
  plugins: [serveGameAssets(), gameWsTokenStub()],
});
