// timer.js — точный помодоро-таймер с коррекцией дрейфа и тем же публичным API
import { state } from './state.js';

/**
 * Внутренние поля модуля (не в state, чтобы не сериализовать это в LS)
 */
let endAtMs = null; // дедлайн текущей фазы (timestamp, ms)
let tickHandle = null; // id setTimeout (используем setTimeout вместо setInterval)
let focusSecAcc = 0; // аккумулятор пройденных секунд фокуса для события "focus:minute"
let lastTickMs = 0; // для подсчёта delta, чтобы корректно переживать лаги/спящие вкладки

/** Утилиты */
const nowMs = () => Date.now();
const secToMs = (s) => s * 1000;
const clampPosInt = (n, min) => Math.max(min, n | 0);

function scheduleNextTick() {
  // Планируем следующий тик на границу секунды, чтобы секунды "щелкали" ровно.
  const ms = nowMs();
  const remainder = ms % 1000;
  const delay = Math.max(50, 1000 - remainder); // >=50ms, чтобы не ставить слишком короткие таймауты
  tickHandle = setTimeout(tick, delay);
}

function clearTick() {
  if (tickHandle) {
    clearTimeout(tickHandle);
    tickHandle = null;
  }
}

/** Переустановка дедлайна в зависимости от секунд */
function setEndFromSeconds(seconds) {
  endAtMs = nowMs() + secToMs(seconds);
}

/** Плавный пересчёт оставшегося времени от дедлайна */
function recomputeRemainingFromDeadline() {
  if (!endAtMs) return;
  const leftMs = Math.max(0, endAtMs - nowMs());
  state.remaining = Math.round(leftMs / 1000);
}

/** Переход фазы */
function phaseEnd(skipped = false) {
  const prevPhase = state.phase;
  const finishedFocus = prevPhase === 'focus';

  // Следующая фаза
  const nextPhase = prevPhase === 'focus' ? 'break' : 'focus';
  state.phase = nextPhase;

  // Устанавливаем новую длительность/дедлайн
  const nextSec = nextPhase === 'focus' ? state.durations.focusSec : state.durations.breakSec;
  state.remaining = nextSec;
  setEndFromSeconds(nextSec);

  // Учет цикла: считаем "цикл" как завершение периода фокуса (если не skip)
  if (finishedFocus && !skipped) {
    state.cyclesDone += 1;

    if (state.cyclesTarget && state.cyclesDone >= state.cyclesTarget) {
      // План завершён
      state.running = false;
      state.phase = 'idle';
      state.remaining = state.durations.focusSec;
      endAtMs = null;
      clearTick();

      document.dispatchEvent(
        new CustomEvent('plan:done', { detail: { cyclesDone: state.cyclesDone } })
      );
      return;
    }
  }

  // Событие смены фазы
  document.dispatchEvent(
    new CustomEvent('timer:phase', { detail: { from: prevPhase, to: nextPhase, skipped } })
  );

  // Если авто-режим выключен — останавливаемся на границе фаз
  if (!state.auto) {
    pause();
    return;
  }

  // Если авто включён — продолжаем тики
  if (state.running) {
    scheduleNextTick();
  }
}

/** Основной тик */
function tick() {
  tickHandle = null;

  // Если нас остановили — не продолжаем
  if (!state.running) return;

  // Корректно пересчитываем оставшиеся секунды от дедлайна
  recomputeRemainingFromDeadline();

  const now = nowMs();
  const deltaSec = Math.max(1, Math.round((now - lastTickMs) / 1000)); // >=1 сек
  lastTickMs = now;

  // Минутная телеметрия только в фазе фокуса
  if (state.phase === 'focus') {
    focusSecAcc += deltaSec;
    if (focusSecAcc >= 60) {
      const minutes = Math.floor(focusSecAcc / 60);
      focusSecAcc = focusSecAcc % 60;
      document.dispatchEvent(new CustomEvent('focus:minute', { detail: minutes }));
    }
  } else {
    focusSecAcc = 0;
  }

  // Завершение фазы
  if (state.remaining <= 0) {
    phaseEnd(false);
    return;
  }

  // Планируем следующий тик
  scheduleNextTick();
}

/* =========================
   Публичный API (без изменений)
   ========================= */

export function start() {
  if (state.running) return;

  // Если таймер стоял в idle — начинаем с фокуса
  if (state.phase === 'idle') {
    state.phase = 'focus';
    state.remaining = state.durations.focusSec;
  }

  // Если дедлайн не выставлен — выставляем от текущего remaining
  if (!endAtMs) setEndFromSeconds(state.remaining);

  state.running = true;
  lastTickMs = nowMs();
  clearTick();
  scheduleNextTick();
}

export function pause() {
  // Пересчитать оставшееся по дедлайну, очистить дедлайн
  recomputeRemainingFromDeadline();
  endAtMs = null;
  state.running = false;
  clearTick();
}

export function reset() {
  clearTick();
  state.running = false;
  state.phase = 'idle';
  state.remaining = state.durations.focusSec;
  state.cyclesDone = 0;
  endAtMs = null;
  focusSecAcc = 0;
}

/** Установка пресета (минуты) */
export function setPreset(focusMin, breakMin) {
  state.durations.focusSec = clampPosInt((focusMin | 0) * 60, 60);
  state.durations.breakSec = clampPosInt((breakMin | 0) * 60, 60);

  if (state.phase === 'idle') {
    // при простое просто меняем "начальное" значение
    state.remaining = state.durations.focusSec;
    endAtMs = null;
    return;
  }

  // Если идёт какой-то режим — обновим дедлайн под новую длительность текущей фазы
  if (state.running) {
    const secs = state.phase === 'focus' ? state.durations.focusSec : state.durations.breakSec;
    setEndFromSeconds(secs);
  } else {
    // на паузе — пересчёт remaining для текущей фазы
    state.remaining = state.phase === 'focus' ? state.durations.focusSec : state.durations.breakSec;
    endAtMs = null;
  }
}

export function setAuto(v) {
  state.auto = !!v;
}

export function toggleAuto() {
  state.auto = !state.auto;
}

export function setTheme(mode) {
  state.theme = mode;
}

export function setCycles(n) {
  const v = (n | 0) > 0 ? n | 0 : null;
  state.cyclesTarget = v;
  state.cyclesDone = 0;
}

/** Пропуск текущей фазы (моментально) */
export function skip() {
  if (state.phase === 'idle') return;
  // Сбрасываем remaining и переходим к phaseEnd как к естественному завершению
  state.remaining = 0;
  phaseEnd(true);
}
