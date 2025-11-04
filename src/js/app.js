// app.js — ядро таймера + единая логика темы на кнопке в сайдбаре
import { state } from './state.js';
import * as timer from './timer.js';
import { sync } from './ui.js';
import { playStart } from './sfx.js';
import { save, load } from './storage.js';

const THEME_STORAGE_KEY = 'pomodoro:theme';

// ---------- utils ----------
const qs = (s) => document.querySelector(s);
const byId = (id) => document.getElementById(id);
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const toInt = (v, fb = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fb;
};
const snapshotState = () => ({
  phase: state.phase,
  running: state.running,
  durations: state.durations,
  remaining: state.remaining,
  auto: state.auto,
  sound: state.sound,
  theme: state.theme,
});

// ---------- DOM ----------
const dom = {
  tomatoBtn: byId('tomatoBtn'),
  themeToggle: byId('themeToggle'),

  // устаревшие/вспомогательные контролы (могут отсутствовать)
  legacy: {
    preset: qs('#preset'),
    customRow: qs('#customRow'),
    focus: qs('#focusMin'),
    break: qs('#breakMin'),
    applyCustom: qs('#applyCustom'),
    autoToggle: qs('#autoToggle'),
    soundToggle: qs('#soundToggle'),
    resetButton: qs('#resetBtn'),
  },

  // актуальные тумблеры в сайдбаре «Настроить»
  builder: {
    autoToggle: byId('bAuto'),
    soundToggle: byId('bSound'),
  },
};

function syncOptionToggles() {
  const { legacy, builder } = dom;
  const a = !!state.auto;
  const s = !!state.sound;
  if (legacy.autoToggle) legacy.autoToggle.checked = a;
  if (legacy.soundToggle) legacy.soundToggle.checked = s;
  if (builder.autoToggle) builder.autoToggle.checked = a;
  if (builder.soundToggle) builder.soundToggle.checked = s;
}

// ---------- persist ----------
let lastPersisted = '';
function persistState(force = false) {
  // тема дублируется в localStorage — это ок: быстрое применение при старте
  try {
    localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  } catch {}

  const snap = snapshotState();
  const str = JSON.stringify(snap);
  if (!force && str === lastPersisted) return;
  save(snap);
  lastPersisted = str;
}

// ---------- theme (единая точка правды) ----------
const theme = {
  applyClasses() {
    const isDay = state.theme === 'day';
    document.body.classList.toggle('day', isDay);
    document.body.classList.toggle('night', !isDay);
  },
  renderToggle() {
    const t = dom.themeToggle;
    if (!t) return;
    const isDay = state.theme === 'day';
    const icon = isDay ? '🌞' : '🌙';
    const modeLabel = isDay ? 'Дневной режим' : 'Ночной режим';
    const actionLabel = isDay ? 'Переключить на ночной режим' : 'Переключить на дневной режим';
    const iconSpan = t.querySelector('.theme-toggle__icon');
    const textSpan = t.querySelector('.theme-toggle__text');
    if (iconSpan) iconSpan.textContent = icon;
    if (textSpan) textSpan.textContent = modeLabel;
    t.setAttribute('aria-label', actionLabel);
    t.setAttribute('title', actionLabel);
    t.setAttribute('aria-pressed', String(!isDay));
  },
  set(mode) {
    state.theme = mode === 'day' ? 'day' : 'night';
    this.applyClasses();
    this.renderToggle();
    document.dispatchEvent(
      new CustomEvent('theme:changed', { detail: { night: state.theme !== 'day' } })
    );
    sync();
    persistState(true);
  },
  init() {
    // приоритет: localStorage -> класс body -> дефолт night
    let initial = 'night';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'day' || stored === 'night') initial = stored;
      else initial = document.body.classList.contains('day') ? 'day' : 'night';
    } catch {
      initial = document.body.classList.contains('day') ? 'day' : 'night';
    }
    this.set(initial);
  },
};

// ---------- restore ----------
(function restore() {
  const restored = load();
  if (restored && typeof restored === 'object') {
    Object.assign(state, restored);
  }
  if (state.phase === 'idle') {
    state.remaining = state.durations.focusSec;
  }
  syncOptionToggles();
})();

// ---------- heartbeat (1 шт. на приложение) ----------
let hbId = null;
function heartbeat() {
  sync();
  persistState();
}
function startHeartbeat() {
  if (hbId) return;
  hbId = setInterval(heartbeat, 1000);
}
function stopHeartbeat() {
  if (!hbId) return;
  clearInterval(hbId);
  hbId = null;
}
// экономия батареи при скрытии вкладки
on(document, 'visibilitychange', () => {
  if (document.hidden) stopHeartbeat();
  else startHeartbeat();
});

// ---------- interactions ----------
on(dom.tomatoBtn, 'click', () => {
  if (state.running) {
    timer.pause();
  } else {
    timer.start();
    if (state.sound) playStart();
  }
  sync();
  persistState();
});

on(dom.themeToggle, 'click', () => {
  theme.set(state.theme === 'day' ? 'night' : 'day');
});

// --- устаревшие/вспомогательные контролы (если они на странице) ---
const legacy = dom.legacy;

function applyPreset(focusMin, breakMin) {
  timer.reset();
  timer.setPreset(focusMin, breakMin);
  sync();
  persistState();
}

on(legacy.preset, 'change', () => {
  if (!legacy.preset) return;
  legacy.customRow?.classList.toggle('hidden', legacy.preset.value !== 'custom');
  if (legacy.preset.value === 'custom') return;
  const [f, b] = legacy.preset.value.split('-').map((v) => toInt(v, 1));
  applyPreset(f, b);
});

on(legacy.applyCustom, 'click', () => {
  const f = Math.max(1, toInt(legacy.focus?.value, 25));
  const b = Math.max(1, toInt(legacy.break?.value, 5));
  applyPreset(f, b);
});

on(legacy.autoToggle, 'change', () => {
  const next = !!legacy.autoToggle?.checked;
  if (typeof timer.setAuto === 'function') timer.setAuto(next);
  state.auto = next;
  syncOptionToggles();
  sync();
  persistState();
});

on(legacy.soundToggle, 'change', () => {
  state.sound = !!legacy.soundToggle?.checked;
  syncOptionToggles();
  sync();
  persistState();
});

on(legacy.resetButton, 'click', () => {
  timer.reset();
  sync();
  persistState(true);
});

// ---------- init ----------
theme.init();
startHeartbeat();

// гарантированная запись перед выгрузкой
on(window, 'beforeunload', () => persistState(true));
