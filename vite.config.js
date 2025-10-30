// vite.config.js — корректная база для GitHub Pages
import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FALLBACK_BASE = '/pomodoro/';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.GH_PAGES_BASE || FALLBACK_BASE;

  return {
    base,
    root: '.',
    server: { port: 5173, open: true },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
  };
});
