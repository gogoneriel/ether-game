import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');

function mimeFor(filePath: string): string {
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.wav')) return 'audio/wav';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

/** Serve ../assets at /game/* so Phaser load paths stay unchanged. */
function serveGameAssets(): Plugin {
  return {
    name: 'serve-game-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/game/')) return next();
        const rel = decodeURIComponent(req.url.slice('/game'.length).split('?')[0] || '/');
        const filePath = path.normalize(path.join(assetsDir, rel));
        if (!filePath.startsWith(assetsDir)) return next();
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();
        res.setHeader('Content-Type', mimeFor(filePath));
        fs.createReadStream(filePath).pipe(res);
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
  plugins: [serveGameAssets()],
});
