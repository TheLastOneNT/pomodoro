// app.js — ядро таймера + интеграция с НОВЫМ sidebar’ом
import { state } from "./state.js";
import * as timer from "./timer.js";
import { sync } from "./ui.js";
import { playStart, playEnd } from "./sfx.js";
import { save, load } from "./storage.js";

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

// (этих старых контролов может уже не быть — делаем мягко)
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

// ---------- theme ----------
function applyThemeClass() {
  // Ночь — по умолчанию
  document.body.classList.toggle("day", state.theme === "day");
  document.body.classList.toggle("night", state.theme !== "day");
}
function renderThemeIcon() {
  if (!themeToggle) return;
  themeToggle.textContent = state.theme === "day" ? "🌞" : "🌙";
}
applyThemeClass();
renderThemeIcon();

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

  // событие окончания интервала (крайне аккуратно, без дребезга)
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
  state.theme = state.theme === "day" ? "night" : "day";
  applyThemeClass();
  renderThemeIcon();
  sync();
  persist();
});

// ---------- (опционально) старые inline-настройки, если они в DOM ----------
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

// ===================================================================
// =========== интеграция с НОВЫМ сайдбаром (sidebar.js) =============
// ===================================================================

// 1) применение плана из сайдбара
document.addEventListener("plan:apply", ({ detail }) => {
  // detail: { focus, break, cycles? } либо уже нормализовано из total
  const f = Math.max(1, toInt(detail.focus, 25));
  const b = Math.max(1, toInt(detail.break, 5));
  timer.reset();
  timer.setPreset(f, b);
  if (
    typeof detail.cycles === "number" &&
    typeof timer.setCycles === "function"
  ) {
    timer.setCycles(Math.max(1, toInt(detail.cycles, 1)));
  }
  sync();
  persist();
});

// 2) сохранение пользовательского пресета — только пробрасываем в storage при необходимости
document.addEventListener("plan:save", ({ detail }) => {
  // detail: { name, icon, focus, break, cycles }
  // сохраняй где хочешь — базовая логика у тебя в storage.js (при желании допиши)
  const presets = JSON.parse(
    localStorage.getItem("pomodoro:user-presets") || "[]"
  );
  presets.push(detail);
  localStorage.setItem("pomodoro:user-presets", JSON.stringify(presets));
});

// 3) опции (звук/автопродолжение) из сайдбара
document.addEventListener("opts:changed", ({ detail }) => {
  if (typeof detail.sound === "boolean") state.sound = detail.sound;
  if (typeof detail.auto === "boolean") {
    state.auto = detail.auto;
    if (typeof timer.setAuto === "function") timer.setAuto(detail.auto);
  }
  sync();
  persist();
});

// 4) тема из сайдбара
document.addEventListener("theme:changed", ({ detail }) => {
  state.theme = detail?.night ? "night" : "day";
  applyThemeClass();
  renderThemeIcon();
  sync();
  persist();
});

// 5) навигация пункта меню (если потребуется подсветить что-то в основной сцене)
document.addEventListener("sidebar:navigate", ({ detail }) => {
  // detail: 'plan' | 'options' | 'history' — пока просто консоль
  // console.log("sidebar->", detail);
});

// ---------- init ----------
sync();
persist();
