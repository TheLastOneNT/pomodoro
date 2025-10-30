import { state } from "./state.js";

const $ = (s) => document.querySelector(s);

// Ленивые ссылки на DOM (модуль может загрузиться до разметки)
let timeEl = null;
let phaseEl = null;
let tomato = null;
let progressArc = null;

// Окружность для прогресса
let C = 0;
function ensureArcInitialized() {
  if (!progressArc) {
    progressArc = document.getElementById("progressArc");
    if (progressArc) {
      const rAttr = progressArc.getAttribute("r");
      const r = rAttr ? Number(rAttr) : 0;
      C = 2 * Math.PI * r;
      if (C > 0) {
        progressArc.setAttribute("stroke-dasharray", String(C));
        progressArc.setAttribute("stroke-dashoffset", String(C));
      }
    }
  }
}

export function fmt(s) {
  s = Math.max(0, s | 0);
  const m = (s / 60) | 0;
  const rSec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rSec).padStart(2, "0")}`;
}

function statusText() {
  if (state.phase === "idle") return "Готовы начать 😌";

  if (state.phase === "focus") {
    return state.running ? "Фокус 🎯" : "Пауза ⏸️";
  }

  if (state.phase === "break") {
    return state.running ? "Перерыв ☕️" : "Пауза ⏸️";
  }

  return "";
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
  // Обновим ленивые ссылки, если их ещё нет
  if (!timeEl) timeEl = $("#time");
  if (!phaseEl) phaseEl = $("#phase");
  if (!tomato) tomato = $("#tomatoBtn");
  ensureArcInitialized();

  // Тема (отрисовка)
  document.body.classList.toggle("day", state.theme === "day");
  document.body.classList.toggle("night", state.theme !== "day");

  // Время и статус
  if (timeEl) timeEl.textContent = fmt(state.remaining);
  if (phaseEl) phaseEl.textContent = statusText();

  // Прогресс
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

// ——— Тост ———
let __toast = null;
export function showToast(msg, ms = 2400) {
  if (!__toast) {
    __toast = document.createElement("div");
    __toast.className = "_toast";
    Object.assign(__toast.style, {
      position: "fixed",
      left: "50%",
      bottom: "20px",
      transform: "translateX(-50%)",
      padding: "10px 14px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,.16)",
      background: "rgba(0,0,0,.78)",
      color: "#fff",
      fontWeight: "800",
      zIndex: 9999,
      pointerEvents: "none",
      transition: "opacity .2s",
      maxWidth: "82vw",
      textAlign: "center",
    });
    document.body.appendChild(__toast);
  }
  __toast.textContent = msg;
  __toast.style.opacity = "1";
  clearTimeout(__toast._t);
  __toast._t = setTimeout(() => (__toast.style.opacity = "0"), ms);
}
