// main.js — точка входа приложения
// Порядок импортов важен: сначала модули с сайд-эффектами (состояние/хранилище/рендер),
// затем функциональные инициализаторы.

import './supa.js';
import './state.js';
import './storage.js';

import './timer.js';
import './ui.js';
import './sidebar.js';
import './sfx.js';
import './app.js';

import { initAuth } from './auth.js';
import { initWheels } from './wheels.js';
import { initHotkeys } from './hotkeys.js';
import { initNotifications, notifyPhase, stopTitleBlink } from './notifications.js';
import { playEnd } from './sfx.js';
import { showToast } from './ui.js';

// ---- защита от повторного запуска (HMR / двойной import) ----
const BOOT_FLAG = '__pomodoro_boot_done__';
const LISTENERS_FLAG = '__pomodoro_listeners_done__';

// Единый обработчик смены фазы
function onTimerPhase(e) {
  const { from, to } = e.detail || {};
  try {
    notifyPhase(to);
  } catch {}
  try {
    if (from === 'focus') playEnd();
  } catch {}
  try {
    showToast(to === 'focus' ? 'Фокус — поехали!' : 'Перерыв — отдохни');
  } catch {}
}

// Единый обработчик для остановки мигания title
function onAnyPointerDown() {
  try {
    stopTitleBlink();
  } catch {}
}

function attachGlobalListenersOnce() {
  if (window[LISTENERS_FLAG]) return;
  window[LISTENERS_FLAG] = true;

  // слушатели вешаем один раз на документ
  document.addEventListener('timer:phase', onTimerPhase);
  document.addEventListener('pointerdown', onAnyPointerDown, { passive: true });
}

function boot() {
  if (window[BOOT_FLAG]) return;
  window[BOOT_FLAG] = true;

  // 1) UI-контролы, завязанные на DOM
  initWheels(); // создаёт number pickers на уже существующей разметке
  initAuth(); // авторизация и статус в топбаре
  initHotkeys(); // горячие клавиши
  initNotifications(); // Web Notifications + title blink

  // 2) Глобальные слушатели (один раз за всю жизнь приложения)
  attachGlobalListenersOnce();
}

// Гарантируем порядок: сначала DOM, затем boot()
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// — На всякий случай: экспорт пустой, чтобы модуль можно было переиспользовать —
export {};
