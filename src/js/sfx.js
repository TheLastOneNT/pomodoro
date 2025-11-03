// src/js/sfx.js — воспроизведение звуков, безопасно и без зависимостей
import { state } from './state.js';

// ---- конфиг ----
const sounds = {
  start: ['/assets/sfx/start.mp3', '/assets/sfx/start.ogg'],
  end: ['/assets/sfx/end.mp3', '/assets/sfx/end.ogg'],
};

// ---- helpers ----
function pickSupported(srcList) {
  const a = document.createElement('audio');
  for (const src of srcList) {
    const type = src.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg';
    if (a.canPlayType(type)) return src;
  }
  return null;
}

function makePlayer(srcList) {
  const src = pickSupported(srcList);
  if (!src) return null;
  const a = new Audio(src);
  a.preload = 'auto';
  a.volume = 0.6;
  return a;
}

// ---- init ----
const players = {
  start: makePlayer(sounds.start),
  end: makePlayer(sounds.end),
};

function safePlay(player) {
  if (!player) return;
  try {
    player.currentTime = 0;
    player.play().catch(() => {});
  } catch (err) {
    console.warn('[sfx] play failed:', err);
  }
}

// ---- API ----
export function playStart() {
  if (!state.sound) return;
  safePlay(players.start);
}

export function playEnd() {
  if (!state.sound) return;
  safePlay(players.end);
}

// ---- preload on first user interaction ----
document.addEventListener(
  'pointerdown',
  () => {
    Object.values(players).forEach((p) => p?.load?.());
  },
  { once: true, passive: true }
);

console.log('[sfx] ready');
