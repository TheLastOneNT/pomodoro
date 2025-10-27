import { state } from "./state.js";

const $ = (s) => document.querySelector(s);
const timeEl = $("#time");
const phaseEl = $("#phase");
const tomato = $("#tomatoBtn");
const progressArc = document.getElementById("progressArc");

const r = Number(progressArc.getAttribute("r"));
const C = 2 * Math.PI * r;
progressArc.setAttribute("stroke-dasharray", String(C));
progressArc.setAttribute("stroke-dashoffset", String(C));

export function fmt(s) {
  s = Math.max(0, s | 0);
  const m = (s / 60) | 0;
  const rSec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rSec).padStart(2, "0")}`;
}

function statusText() {
  if (!state.running) return "Отдыхаем 😌";
  return state.phase === "focus" ? "Фокусируемся 🎯" : "Перерыв ☕️";
}

function setModeClass() {
  tomato.classList.remove("mode-idle", "mode-focus", "mode-break");
  if (!state.running) tomato.classList.add("mode-idle");
  else
    tomato.classList.add(state.phase === "focus" ? "mode-focus" : "mode-break");
}

export function sync() {
  document.body.classList.toggle("day", state.theme === "day");

  timeEl.textContent = fmt(state.remaining);
  phaseEl.textContent = statusText();

  const total =
    state.phase === "break"
      ? state.durations.breakSec
      : state.durations.focusSec;
  const done = total ? 1 - state.remaining / total : 0;
  const offset = Math.max(0, Math.min(C, C - done * C));
  progressArc.setAttribute("stroke-dashoffset", String(offset));

  setModeClass();
}
