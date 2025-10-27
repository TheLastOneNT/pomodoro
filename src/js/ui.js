import { state } from "./state.js";

const $ = (s) => document.querySelector(s);
const timeEl = $("#time");
const phaseEl = $("#phase");
const tomatoBtn = $("#tomatoBtn");

// прогресс
const progressArc = document.getElementById("progressArc");
const r = Number(progressArc.getAttribute("r")); // 138
const C = 2 * Math.PI * r;
progressArc.setAttribute("stroke-dasharray", String(C));
progressArc.setAttribute("stroke-dashoffset", String(C));

export function fmt(s) {
  s = Math.max(0, s | 0);
  const m = (s / 60) | 0,
    r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function statusText() {
  if (!state.running) return "Отдыхаем 😌";
  if (state.phase === "focus") return "Фокусируемся 🎯";
  return "Перерыв ☕️";
}

export function sync() {
  // тема: ночь дефолт → добавляем .day, когда нужно
  document.body.classList.toggle("day", state.theme === "day");

  // цифры и статус
  timeEl.textContent = fmt(state.remaining);
  phaseEl.textContent = statusText();

  // классы для анимаций
  tomatoBtn.classList.toggle("focus", state.phase === "focus");
  tomatoBtn.classList.toggle("break", state.phase === "break");
  tomatoBtn.classList.toggle("running", state.running);

  // прогресс — только заполненная часть
  const total =
    state.phase === "break"
      ? state.durations.breakSec
      : state.durations.focusSec;
  const done = total ? 1 - state.remaining / total : 0;
  const offset = Math.max(0, Math.min(C, C - done * C));
  progressArc.setAttribute("stroke-dashoffset", String(offset));
}
