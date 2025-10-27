import { state } from "./state.js";

const $ = (s) => document.querySelector(s);
const timeEl = $("#time");
const phaseEl = $("#phase");
const tomatoBtn = $("#tomatoBtn");

// слои лица/прогресса
const face = document.getElementById("face");
const mouth = face.querySelector(".mouth");
const progressArc = document.getElementById("progressArc");

// прогресс геометрия
const r = Number(progressArc.getAttribute("r")); // 168
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
  return state.phase === "focus" ? "Фокусируемся 🎯" : "Перерыв ☕️";
}

function applyMood() {
  // режим на кнопке — для анимаций
  tomatoBtn.classList.remove("mode-idle", "mode-focus", "mode-break");
  if (!state.running) tomatoBtn.classList.add("mode-idle");
  else
    tomatoBtn.classList.add(
      state.phase === "focus" ? "mode-focus" : "mode-break"
    );

  // рот / мимика
  mouth.classList.remove("mouth--smile", "mouth--rest", "mouth--pause");
  if (!state.running) mouth.classList.add("mouth--pause");
  else
    mouth.classList.add(
      state.phase === "focus" ? "mouth--smile" : "mouth--rest"
    );
}

export function sync() {
  // тема: ночь дефолт → включаем .day при необходимости
  document.body.classList.toggle("day", state.theme === "day");

  // цифры и статус
  timeEl.textContent = fmt(state.remaining);
  phaseEl.textContent = statusText();

  // прогресс — только заполняемая часть (без «трека»)
  const total =
    state.phase === "break"
      ? state.durations.breakSec
      : state.durations.focusSec;
  const done = total ? 1 - state.remaining / total : 0;
  const offset = Math.max(0, Math.min(C, C - done * C));
  progressArc.setAttribute("stroke-dashoffset", String(offset));

  // настроение/анимации
  applyMood();
}
