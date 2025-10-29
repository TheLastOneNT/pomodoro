import { state } from "./state.js";

const $ = (s) => document.querySelector(s);
const timeEl = $("#time");
const phaseEl = $("#phase");
const tomato = $("#tomatoBtn");
const progressArc = document.getElementById("progressArc");

let C = 0;
if (progressArc) {
  const rAttr = progressArc.getAttribute("r");
  const r = rAttr ? Number(rAttr) : 0;
  C = 2 * Math.PI * r;
  if (C > 0) {
    progressArc.setAttribute("stroke-dasharray", String(C));
    progressArc.setAttribute("stroke-dashoffset", String(C));
  }
}

export function fmt(s) {
  s = Math.max(0, s | 0);
  const m = (s / 60) | 0;
  const rSec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rSec).padStart(2, "0")}`;
}

function statusText() {
  if (!state.running) {
    if (state.phase === "focus") return "Пауза · Фокус 🎯";
    if (state.phase === "break") return "Пауза · Перерыв ☕️";
    return "Готовы начать 😌";
  }
  return state.phase === "focus" ? "Фокусируемся 🎯" : "Перерыв ☕️";
}

function setModeClass() {
  if (!tomato) return;
  tomato.classList.remove("mode-idle", "mode-focus", "mode-break");
  if (!state.running) {
    tomato.classList.add("mode-idle");
  } else {
    tomato.classList.add(state.phase === "focus" ? "mode-focus" : "mode-break");
  }
}

export function sync() {
  document.body.classList.toggle("day", state.theme === "day");
  document.body.classList.toggle("night", state.theme !== "day");

  if (timeEl) timeEl.textContent = fmt(state.remaining);
  if (phaseEl) phaseEl.textContent = statusText();

  const total =
    state.phase === "break"
      ? state.durations.breakSec
      : state.durations.focusSec;

  if (progressArc && C > 0 && total > 0) {
    const done = 1 - state.remaining / total;
    const offset = Math.max(0, Math.min(C, C - done * C));
    progressArc.setAttribute("stroke-dashoffset", String(offset));
  }

  setModeClass();
}
