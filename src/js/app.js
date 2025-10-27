import { state } from "./state.js";
import * as timer from "./timer.js";
import { sync } from "./ui.js";
import { playStart, playEnd } from "./sfx.js";
import { save, load } from "./storage.js";

const $ = (s) => document.querySelector(s);

// DOM
const tomatoBtn = $("#tomatoBtn");
const themeToggle = $("#themeToggle");
const openSettings = $("#openSettings");
const closeSettings = $("#closeSettings");
const panel = $("#settingsPanel");
const backdrop = $("#backdrop");

const preset = $("#preset");
const customRow = $("#customRow");
const focusMin = $("#focusMin");
const breakMin = $("#breakMin");
const applyCustom = $("#applyCustom");
const autoToggle = $("#autoToggle");
const soundToggle = $("#soundToggle");
const resetBtn = $("#resetBtn");

// restore
const saved = load();
if (saved) Object.assign(state, saved);
if (state.phase === "idle") state.remaining = state.durations.focusSec;

// persist
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

// ui beat
function onBeat() {
  sync();
  if (state.remaining === 0) playEnd();
  persist();
}
setInterval(onBeat, 1000);

// interactions
tomatoBtn.addEventListener("click", () => {
  if (state.running) {
    timer.pause();
  } else {
    timer.start();
    playStart();
  }
  sync();
  persist();
});

function renderThemeIcon() {
  themeToggle.textContent = state.theme === "day" ? "🌞" : "🌙";
}
themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "day" ? "night" : "day";
  renderThemeIcon();
  sync();
  persist();
});

// panel
function openPanel() {
  panel.classList.add("open");
  backdrop.classList.add("show");
  panel.setAttribute("aria-hidden", "false");
}
function closePanel() {
  panel.classList.remove("open");
  backdrop.classList.remove("show");
  panel.setAttribute("aria-hidden", "true");
}
openSettings.addEventListener("click", openPanel);
closeSettings.addEventListener("click", closePanel);
backdrop.addEventListener("click", closePanel);

// settings
preset.addEventListener("change", () => {
  customRow.classList.toggle("hidden", preset.value !== "custom");
  if (preset.value !== "custom") {
    const [f, b] = preset.value.split("-").map(Number);
    timer.reset();
    timer.setPreset(f, b);
    sync();
    persist();
  }
});
applyCustom.addEventListener("click", () => {
  const f = Math.max(1, focusMin.value | 0);
  const b = Math.max(1, breakMin.value | 0);
  timer.reset();
  timer.setPreset(f, b);
  sync();
  persist();
});
autoToggle.addEventListener("change", () => {
  timer.toggleAuto();
  sync();
  persist();
});
soundToggle.addEventListener("change", () => {
  state.sound = soundToggle.checked;
  sync();
  persist();
});
resetBtn.addEventListener("click", () => {
  timer.reset();
  sync();
  persist();
});

// init
renderThemeIcon();
sync();
