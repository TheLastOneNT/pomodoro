// app.js — ядро таймера + единая логика темы на кнопке в топбаре
import { state } from "./state.js";
import * as timer from "./timer.js";
import { sync } from "./ui.js";
import { playStart, playEnd } from "./sfx.js";
import { save, load } from "./storage.js";

const THEME_KEY = "pomodoro:theme";

// ---------- utils ----------
const $ = (s) => document.querySelector(s);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const toInt = (v, def = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

// ---------- elements ----------
const tomatoBtn = $("#tomatoBtn");
const themeToggle = $("#themeToggle");

// (старые контролы могут отсутствовать — подключаем мягко)
const preset = $("#preset");
const customRow = $("#customRow");
const focusMin = $("#focusMin");
const breakMin = $("#breakMin");
const applyCustom = $("#applyCustom");
const autoToggle = $("#autoToggle");
const soundToggle = $("#soundToggle");
const resetBtn = $("#resetBtn");

// ---------- restore ----------
const saved = load();
if (saved) Object.assign(state, saved);
if (state.phase === "idle") state.remaining = state.durations.focusSec;

// ---------- theme (единая точка правды) ----------
function applyThemeClass() {
  document.body.classList.toggle("day", state.theme === "day");
  document.body.classList.toggle("night", state.theme !== "day");
}

/**
 * Иконка отражает ТЕКУЩУЮ тему:
 *  - night -> 🌙
 *  - day   -> 🌞
 * Tooltip/aria-label описывает СЛЕДУЮЩЕЕ действие (что будет при клике).
 */
function renderThemeButton() {
  if (!themeToggle) return;
  const curIcon = state.theme === "day" ? "🌞" : "🌙";
  const nextLabel =
    state.theme === "day"
      ? "Сменить на тёмную тему"
      : "Сменить на светлую тему";

  themeToggle.textContent = curIcon;
  themeToggle.setAttribute("aria-label", nextLabel);
  themeToggle.setAttribute("title", nextLabel);
}

function setTheme(mode /* 'day' | 'night' */) {
  state.theme = mode === "day" ? "day" : "night";
  try {
    localStorage.setItem(THEME_KEY, state.theme);
  } catch {}
  applyThemeClass();
  renderThemeButton();

  document.dispatchEvent(
    new CustomEvent("theme:changed", {
      detail: { night: state.theme !== "day" },
    })
  );

  sync();
  persist();
}

// init: берём из localStorage, иначе из текущего класса body, иначе — night
(function initTheme() {
  let mode = null;
  try {
    mode = localStorage.getItem(THEME_KEY);
  } catch {}
  if (mode !== "day" && mode !== "night") {
    mode = document.body.classList.contains("day") ? "day" : "night";
  }
  setTheme(mode);
})();

// ---------- persist ----------
function persist() {
  save({
    phase: state.phase,
    running: state.running,
    durations: state.durations,
    remaining: state.remaining,
    auto: state.auto,
    sound: state.sound,
    theme: state.theme,
  });
}

// ---------- tick ----------
let lastRemaining = state.remaining;
setInterval(() => {
  sync();
  if (state.remaining === 0 && lastRemaining !== 0) {
    if (state.sound) playEnd();
  }
  lastRemaining = state.remaining;
  persist();
}, 1000);

// ---------- interactions ----------
on(tomatoBtn, "click", () => {
  if (state.running) {
    timer.pause();
  } else {
    timer.start();
    if (state.sound) playStart();
  }
  sync();
  persist();
});

on(themeToggle, "click", () => {
  setTheme(state.theme === "day" ? "night" : "day");
});

// ---------- (опционально) старые inline-настройки ----------
on(preset, "change", () => {
  if (!preset) return;
  if (customRow)
    customRow.classList.toggle("hidden", preset.value !== "custom");
  if (preset.value !== "custom") {
    const [f, b] = preset.value.split("-").map((x) => toInt(x, 1));
    timer.reset();
    timer.setPreset(f, b);
    sync();
    persist();
  }
});
on(applyCustom, "click", () => {
  const f = Math.max(1, toInt(focusMin?.value, 25));
  const b = Math.max(1, toInt(breakMin?.value, 5));
  timer.reset();
  timer.setPreset(f, b);
  sync();
  persist();
});
on(autoToggle, "change", () => {
  if (typeof timer.setAuto === "function") timer.setAuto(!!autoToggle.checked);
  state.auto = !!autoToggle.checked;
  sync();
  persist();
});
on(soundToggle, "change", () => {
  state.sound = !!soundToggle.checked;
  sync();
  persist();
});
on(resetBtn, "click", () => {
  timer.reset();
  sync();
  persist();
});

// ---------- init ----------
sync();
persist();
