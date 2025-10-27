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
}
export function setPreset(focusMin, breakMin) {
  state.durations.focusSec = Math.max(60, (focusMin | 0) * 60);
  state.durations.breakSec = Math.max(60, (breakMin | 0) * 60);
  if (state.phase === "idle") state.remaining = state.durations.focusSec;
}
export function toggleAuto() {
  state.auto = !state.auto;
}
export function setTheme(mode) {
  state.theme = mode;
}

function tick() {
  if (!state.running) return;
  state.remaining -= 1;
  if (state.remaining <= 0) phaseEnd();
}
function phaseEnd() {
  const next = state.phase === "focus" ? "break" : "focus";
  state.phase = next;
  state.remaining =
    next === "focus" ? state.durations.focusSec : state.durations.breakSec;
  state.running = !!state.auto;
}
