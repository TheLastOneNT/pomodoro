// ui.js — рендер таймера, статусной строки и прогресс-дуги
import { state } from './state.js';

const $ = (s) => document.querySelector(s);

/* ------------------------------
   Ленивые ссылки на DOM
--------------------------------*/
let dom = {
  time: null,
  phase: null,
  tomatoBtn: null,
  arc: null,
};

// Длина окружности SVG-дуги прогресса
let arcLen = 0;

/** Разовая инициализация дуги прогресса */
function ensureArcInitialized() {
  if (dom.arc) return;

  dom.arc = document.getElementById('progressArc');
  if (!dom.arc) return;

  const r = Number(dom.arc.getAttribute('r') || 0);
  arcLen = 2 * Math.PI * r;

  if (arcLen > 0) {
    dom.arc.setAttribute('stroke-dasharray', String(arcLen));
    dom.arc.setAttribute('stroke-dashoffset', String(arcLen));
  }
}

/** Разовая инициализация ссылок на элементы */
function ensureDom() {
  if (!dom.time) dom.time = $('#time');
  if (!dom.phase) dom.phase = $('#phase');
  if (!dom.tomatoBtn) dom.tomatoBtn = $('#tomatoBtn');
  ensureArcInitialized();
}

/* ------------------------------
   Форматирование и статус
--------------------------------*/
export function fmt(s) {
  s = Math.max(0, s | 0);
  const m = (s / 60) | 0;
  const rSec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rSec).padStart(2, '0')}`;
}

function statusText() {
  switch (state.phase) {
    case 'idle':
      return 'Готовы начать 😌';
    case 'focus':
      return state.running ? 'Фокус 🎯' : 'Пауза ⏸️';
    case 'break':
      return state.running ? 'Перерыв ☕️' : 'Пауза ⏸️';
    default:
      return '';
  }
}

/* ------------------------------
   Рендер
--------------------------------*/
function setBodyTheme() {
  // двоичное переключение классов темы
  const isDay = state.theme === 'day';
  document.body.classList.toggle('day', isDay);
  document.body.classList.toggle('night', !isDay);
}

function currentTomatoMode() {
  if (state.phase === 'idle') return 'mode-idle';
  if (!state.running) return 'mode-pause';
  return state.phase === 'focus' ? 'mode-focus' : 'mode-break';
}

function setTomatoModeClasses() {
  const modeClass = currentTomatoMode();

  if (dom.tomatoBtn) {
    dom.tomatoBtn.classList.remove('mode-idle', 'mode-focus', 'mode-break', 'mode-pause');
    dom.tomatoBtn.classList.add(modeClass);
    dom.tomatoBtn.setAttribute('aria-pressed', String(!!state.running));
  }

  const modeName = modeClass.replace('mode-', '');
  if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.pomoMode = modeName;
  }
}

function setProgress() {
  if (!dom.arc || arcLen <= 0) return;

  // Определяем полный объём текущей фазы
  let total = state.phase === 'break' ? state.durations.breakSec : state.durations.focusSec;

  // В idle считаем прогресс пустым
  if (state.phase === 'idle') total = Math.max(1, state.durations.focusSec);

  // done = доля пройденного (0..1)
  const done = Math.min(1, Math.max(0, 1 - state.remaining / total));
  const offset = arcLen - done * arcLen;

  dom.arc.setAttribute('stroke-dashoffset', String(offset));
}

let lastDraw = {
  remaining: null,
  phase: null,
  running: null,
  theme: null,
};

/** Главный публичный рендер */
export function sync() {
  ensureDom();

  // тема — сразу (чаще всего это отдельная кнопка)
  if (lastDraw.theme !== state.theme) {
    setBodyTheme();
    lastDraw.theme = state.theme;
  }

  // текст времени (мигаем только при изменении сек)
  if (dom.time && lastDraw.remaining !== state.remaining) {
    dom.time.textContent = fmt(state.remaining);
    lastDraw.remaining = state.remaining;
  }

  // статусная строка и aria-live
  const st = statusText();
  if (dom.phase && (lastDraw.phase !== state.phase || lastDraw.running !== state.running)) {
    dom.phase.textContent = st;
  }

  // режимы кнопки и её aria-pressed
  if (lastDraw.phase !== state.phase || lastDraw.running !== state.running) {
    setTomatoModeClasses();
    lastDraw.phase = state.phase;
    lastDraw.running = state.running;
  }

  // прогресс — каждый sync
  setProgress();
}

/* ------------------------------
   Простой тост (без зависимостей)
--------------------------------*/
let toastEl = null;
export function showToast(msg, ms = 2400) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = '_toast';
    Object.assign(toastEl.style, {
      position: 'fixed',
      left: '50%',
      bottom: '20px',
      transform: 'translateX(-50%)',
      padding: '10px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,.16)',
      background: 'rgba(0,0,0,.78)',
      color: '#fff',
      fontWeight: '800',
      zIndex: 9999,
      pointerEvents: 'none',
      transition: 'opacity .2s',
      maxWidth: '82vw',
      textAlign: 'center',
      opacity: '0',
    });
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => {
    toastEl.style.opacity = '0';
  }, ms);
}
