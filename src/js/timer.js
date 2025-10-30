import { state } from "./state.js";

let endAt = null; // дедлайн в мс
let acc = 0; // учёт минут фокуса (как было)

function nowMs() {
  return Date.now();
}
function setEndFromSeconds(seconds) {
  endAt = nowMs() + seconds * 1000;
}

export function start() {
  if (state.running) return;

  if (state.phase === "idle") {
    state.phase = "focus";
    state.remaining = state.durations.focusSec;
  }

  if (!endAt) setEndFromSeconds(state.remaining);
  state.running = true;
  if (!state.intervalId) state.intervalId = setInterval(tick, 1000);
}

export function pause() {
  // зафиксируем остаток по дедлайну и уберём дедлайн
  if (endAt) {
    const leftMs = Math.max(0, endAt - nowMs());
    state.remaining = Math.round(leftMs / 1000);
  }
  endAt = null;
  state.running = false;
}

export function reset() {
  state.running = false;
  state.phase = "idle";
  state.remaining = state.durations.focusSec;
  state.cyclesDone = 0;
  endAt = null;
}

/** Установка пресета в минутах */
export function setPreset(focusMin, breakMin) {
  state.durations.focusSec = Math.max(60, (focusMin | 0) * 60);
  state.durations.breakSec = Math.max(60, (breakMin | 0) * 60);

  if (state.phase === "idle") {
    state.remaining = state.durations.focusSec;
    endAt = null;
  } else if (state.running && endAt) {
    // переинициализируем текущий интервал с новой длительностью текущей фазы
    const secs =
      state.phase === "focus"
        ? state.durations.focusSec
        : state.durations.breakSec;
    setEndFromSeconds(secs);
  }
}

/** Автопродолжение */
export function setAuto(v) {
  state.auto = !!v;
}

/** Целевая длина плана в циклах */
export function setCycles(n) {
  const v = (n | 0) > 0 ? n | 0 : null;
  state.cyclesTarget = v;
  state.cyclesDone = 0;
}

export function toggleAuto() {
  state.auto = !state.auto;
}
export function setTheme(mode) {
  state.theme = mode;
}

/** Пропуск текущей фазы (немедленный переход) */
export function skip() {
  if (state.phase === "idle") return;
  // доводим до нуля и завершаем фазу
  state.remaining = 0;
  phaseEnd(/* skipped */ true);
}

// ---------------- internal ----------------
function tick() {
  if (!state.running) return;

  // рассчитываем остаток от дедлайна
  if (endAt) {
    const leftMs = Math.max(0, endAt - nowMs());
    state.remaining = Math.round(leftMs / 1000);
  }

  // учёт минут фокуса
  if (state.phase === "focus") {
    acc += 1;
    if (acc >= 60) {
      acc = 0;
      document.dispatchEvent(new CustomEvent("focus:minute", { detail: 1 }));
    }
  } else {
    acc = 0;
  }

  if (state.remaining <= 0) phaseEnd(false);
}

function phaseEnd(skipped = false) {
  const was = state.phase;
  const finishedFocus = was === "focus";

  const next = was === "focus" ? "break" : "focus";
  state.phase = next;
  state.remaining =
    next === "focus" ? state.durations.focusSec : state.durations.breakSec;
  setEndFromSeconds(state.remaining);

  if (finishedFocus && !skipped) {
    state.cyclesDone += 1;
    if (state.cyclesTarget && state.cyclesDone >= state.cyclesTarget) {
      state.running = false;
      state.phase = "idle";
      state.remaining = state.durations.focusSec;
      endAt = null;
      document.dispatchEvent(
        new CustomEvent("plan:done", {
          detail: { cyclesDone: state.cyclesDone },
        })
      );
      return;
    }
  }

  // уведомим UI/аппы о смене фазы
  document.dispatchEvent(
    new CustomEvent("timer:phase", {
      detail: { from: was, to: next, skipped },
    })
  );

  // автопродолжение/пауза
  if (!state.auto) {
    pause(); // зафиксирует remaining и сбросит endAt
  }
}
