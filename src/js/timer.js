import { state } from "./state.js";

export function start() {
  if (state.running) return;

  if (state.phase === "idle") {
    state.phase = "focus";
    state.remaining = state.durations.focusSec;
  }

  state.running = true;
  if (!state.intervalId) state.intervalId = setInterval(tick, 1000);
}

export function pause() {
  state.running = false;
}

export function reset() {
  state.running = false;
  state.phase = "idle";
  state.remaining = state.durations.focusSec;
  state.cyclesDone = 0;
}

/** Установка пресета в минутах */
export function setPreset(focusMin, breakMin) {
  state.durations.focusSec = Math.max(60, (focusMin | 0) * 60);
  state.durations.breakSec = Math.max(60, (breakMin | 0) * 60);
  if (state.phase === "idle") state.remaining = state.durations.focusSec;
}

/** Автопродолжение (для совместимости с app.js и сайдбаром) */
export function setAuto(v) {
  state.auto = !!v;
}

/** Целевая длина плана в циклах (опционально) */
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

// ---------------- internal ----------------

let acc = 0; // для учёта минут фокуса в статистике

function tick() {
  if (!state.running) return;

  state.remaining -= 1;

  // учёт минут фокуса (не навязываю UI: просто диспатчим событие раз в минуту)
  if (state.phase === "focus") {
    acc++;
    if (acc >= 60) {
      acc = 0;
      document.dispatchEvent(new CustomEvent("focus:minute", { detail: 1 }));
    }
  } else {
    acc = 0;
  }

  if (state.remaining <= 0) phaseEnd();
}

function phaseEnd() {
  // завершение фокуса = завершён 1 цикл
  const justFinishedFocus = state.phase === "focus";

  const next = state.phase === "focus" ? "break" : "focus";
  state.phase = next;
  state.remaining =
    next === "focus" ? state.durations.focusSec : state.durations.breakSec;

  if (justFinishedFocus) {
    state.cyclesDone += 1;

    // если есть целевое число циклов — стопаем после его достижения
    if (state.cyclesTarget && state.cyclesDone >= state.cyclesTarget) {
      state.running = false;
      state.phase = "idle";
      state.remaining = state.durations.focusSec;
      document.dispatchEvent(
        new CustomEvent("plan:done", {
          detail: { cyclesDone: state.cyclesDone },
        })
      );
      return;
    }
  }

  // автопродолжение/пауза
  state.running = !!state.auto;
}
