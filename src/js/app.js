// app.js — ядро таймера + единая логика темы на кнопке в топбаре
import { state } from './state.js';
import * as timer from './timer.js';
import { sync } from './ui.js';
import { playStart } from './sfx.js';
import { save, load } from './storage.js';

const THEME_STORAGE_KEY = 'pomodoro:theme';

// ---------- utils ----------
const qs = (selector) => document.querySelector(selector);
const getById = (id) => document.getElementById(id);
const attach = (node, event, handler, options) => node?.addEventListener(event, handler, options);
const toInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function snapshotState() {
  return {
    phase: state.phase,
    running: state.running,
    durations: state.durations,
    remaining: state.remaining,
    auto: state.auto,
    sound: state.sound,
    theme: state.theme,
  };
}

// ---------- elements ----------
const dom = {
  tomatoButton: getById('tomatoBtn'),
  themeToggle: getById('themeToggle'),
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
  builder: {
    autoToggle: getById('bAuto'),
    soundToggle: getById('bSound'),
  },
};

function syncOptionToggles() {
  const { legacy, builder } = dom;
  if (legacy.autoToggle) legacy.autoToggle.checked = !!state.auto;
  if (legacy.soundToggle) legacy.soundToggle.checked = !!state.sound;
  if (builder.autoToggle) builder.autoToggle.checked = !!state.auto;
  if (builder.soundToggle) builder.soundToggle.checked = !!state.sound;
}

// ---------- restore ----------
const restoredState = load();
if (restoredState) Object.assign(state, restoredState);
if (state.phase === 'idle') {
  state.remaining = state.durations.focusSec;
}
syncOptionToggles();

// ---------- theme (единая точка правды) ----------
const theme = {
  applyClasses() {
    document.body.classList.toggle('day', state.theme === 'day');
    document.body.classList.toggle('night', state.theme !== 'day');
  },

  renderToggle() {
    const toggle = dom.themeToggle;
    if (!toggle) return;

    const isDay = state.theme === 'day';
    const icon = isDay ? '🌞' : '🌙';
    const label = isDay ? 'Сменить на тёмную тему' : 'Сменить на светлую тему';

    toggle.textContent = icon;
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  },

  set(mode) {
    state.theme = mode === 'day' ? 'day' : 'night';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    } catch {}

    this.applyClasses();
    this.renderToggle();

    document.dispatchEvent(
      new CustomEvent('theme:changed', { detail: { night: state.theme !== 'day' } })
    );

    sync();
    persistState();
  },

  init() {
    let initialTheme = null;
    try {
      initialTheme = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {}

    if (initialTheme !== 'day' && initialTheme !== 'night') {
      initialTheme = document.body.classList.contains('day') ? 'day' : 'night';
    }

    this.set(initialTheme);
  },
};

// ---------- persist ----------
let lastPersistedSnapshot = '';
function persistState(force = false) {
  const snapshot = snapshotState();
  const serialized = JSON.stringify(snapshot);
  if (!force && serialized === lastPersistedSnapshot) return;

  save(snapshot);
  lastPersistedSnapshot = serialized;
}

// ---------- heartbeat ----------
function heartbeat() {
  sync();
  persistState();
}

setInterval(heartbeat, 1000);

// ---------- interactions ----------
attach(dom.tomatoButton, 'click', () => {
  if (state.running) {
    timer.pause();
  } else {
    timer.start();
    if (state.sound) {
      playStart();
    }
  }

  sync();
  persistState();
});

attach(dom.themeToggle, 'click', () => {
  theme.set(state.theme === 'day' ? 'night' : 'day');
});

// ---------- (опционально) старые inline-настройки ----------
function applyPreset(focusMinutes, breakMinutes) {
  timer.reset();
  timer.setPreset(focusMinutes, breakMinutes);
  sync();
  persistState();
}

const legacy = dom.legacy;

attach(legacy.preset, 'change', () => {
  if (!legacy.preset) return;

  legacy.customRow?.classList.toggle('hidden', legacy.preset.value !== 'custom');
  if (legacy.preset.value === 'custom') return;

  const [focusMinutes, breakMinutes] = legacy.preset.value
    .split('-')
    .map((value) => toInt(value, 1));

  applyPreset(focusMinutes, breakMinutes);
});

attach(legacy.applyCustom, 'click', () => {
  const focusMinutes = Math.max(1, toInt(legacy.focus?.value, 25));
  const breakMinutes = Math.max(1, toInt(legacy.break?.value, 5));

  applyPreset(focusMinutes, breakMinutes);
});

attach(legacy.autoToggle, 'change', () => {
  const nextValue = !!legacy.autoToggle?.checked;
  if (typeof timer.setAuto === 'function') {
    timer.setAuto(nextValue);
  }
  state.auto = nextValue;
  syncOptionToggles();
  sync();
  persistState();
});

attach(legacy.soundToggle, 'change', () => {
  state.sound = !!legacy.soundToggle?.checked;
  syncOptionToggles();
  sync();
  persistState();
});

attach(legacy.resetButton, 'click', () => {
  timer.reset();
  sync();
  persistState();
});

// ---------- init ----------
theme.init();
heartbeat();
