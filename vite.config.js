// vite.config.js
import { defineConfig } from 'vite';
import path from 'node:path';

// Если деплоишь на GitHub Pages в репо thelastonent/pomodoro,
// установи переменную окружения GH_PAGES_BASE=/pomodoro/
// или просто впиши base: "/pomodoro/" ниже.
const base = process.env.GH_PAGES_BASE || '/';

export default defineConfig({
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
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
