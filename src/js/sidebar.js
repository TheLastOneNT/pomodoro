// Меню «План занятий» (две вкладки: Настроить / Выбрать) + открытие/закрытие.
// Вся тема (день/ночь) — в app.js. Здесь только планы.

import * as timer from "./timer.js";
import { sync } from "./ui.js";

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v | 0));
const totalMinutes = (f, b, c) => c * (f + b);

// storage
const KEY_CUSTOM = "pomodoro:plans:custom"; // массив пользовательских планов
// элемент плана: { id, name, focus, break, cycles, total, type: 'custom'|'preset' }

// ---------- open/close ----------
const openBtn = $("#openSettings");
const closeBtn = $("#sbClose");
const sidebar = $("#sidebar");
const backdrop = $("#sidebarBackdrop");

function openSB() {
  if (!sidebar || !backdrop) return;
  sidebar.classList.add("show");
  backdrop.classList.add("show");
  sidebar.setAttribute("aria-hidden", "false");
}
function closeSB() {
  if (!sidebar || !backdrop) return;
  sidebar.classList.remove("show");
  backdrop.classList.remove("show");
  sidebar.setAttribute("aria-hidden", "true");
}
openBtn?.addEventListener("click", openSB);
closeBtn?.addEventListener("click", closeSB);
backdrop?.addEventListener("click", closeSB);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSB();
});

// ---------- tabs ----------
const tabBtns = $$(".seg__btn[data-mode]");
const panes = $$(".pane");
function openTab(mode) {
  tabBtns.forEach((b) =>
    b.classList.toggle("is-active", b.dataset.mode === mode)
  );
  panes.forEach((p) => p.classList.toggle("is-open", p.dataset.pane === mode));
}
tabBtns.forEach((b) =>
  b.addEventListener("click", () => openTab(b.dataset.mode))
);
openTab("build");

// ---------- BUILD (Настроить) ----------
const bFocus = $("#bFocus");
const bBreak = $("#bBreak");
const bCycles = $("#bCycles");
const bMeta = $("#bMeta");
const bApply = $("#bApply");
const bSaveToggle = $("#bSaveToggle");
const bSaveBlock = $("#bSaveBlock");
const bName = $("#bName");
const bSave = $("#bSave");

function updateBuildMeta() {
  const f = clamp(bFocus?.valueAsNumber || 25, 1, 180);
  const br = clamp(bBreak?.valueAsNumber || 5, 1, 60);
  const c = clamp(bCycles?.valueAsNumber || 4, 1, 20);
  if (bMeta)
    bMeta.textContent = `${f}/${br} ×${c} ≈ ${totalMinutes(f, br, c)} мин`;
}
["input", "change"].forEach((ev) => {
  bFocus?.addEventListener(ev, updateBuildMeta);
  bBreak?.addEventListener(ev, updateBuildMeta);
  bCycles?.addEventListener(ev, updateBuildMeta);
});
updateBuildMeta();

bApply?.addEventListener("click", () => {
  const f = clamp(bFocus?.valueAsNumber || 25, 1, 180);
  const br = clamp(bBreak?.valueAsNumber || 5, 1, 60);
  const c = clamp(bCycles?.valueAsNumber || 4, 1, 20);
  timer.reset();
  timer.setPreset(f, br);
  timer.setCycles(c);
  sync();
});

bSaveToggle?.addEventListener("click", () => {
  bSaveBlock?.classList.toggle("hidden");
  bName?.focus();
});

function readCustom() {
  try {
    return JSON.parse(localStorage.getItem(KEY_CUSTOM) || "[]");
  } catch {
    return [];
  }
}
function writeCustom(arr) {
  try {
    localStorage.setItem(KEY_CUSTOM, JSON.stringify(arr));
  } catch {}
}

bSave?.addEventListener("click", () => {
  const name = (bName?.value || "").trim() || "Мой план";
  const f = clamp(bFocus?.valueAsNumber || 25, 1, 180);
  const br = clamp(bBreak?.valueAsNumber || 5, 1, 60);
  const c = clamp(bCycles?.valueAsNumber || 4, 1, 20);
  const item = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    focus: f,
    break: br,
    cycles: c,
    total: totalMinutes(f, br, c),
    type: "custom",
  };
  const arr = readCustom();
  arr.unshift(item);
  writeCustom(arr);
  bSaveBlock?.classList.add("hidden");
  bName && (bName.value = "");
  renderMine();
  openTab("pick");
});

// ---------- PICK (Выбрать) ----------
const listMine = $("#listMine");
const listPresets = $("#listPresets");

// готовые пресеты (можно дополнять/менять)
const PRESETS = [
  {
    id: "p_1h_25_5_x2",
    name: "1 час",
    focus: 25,
    break: 5,
    cycles: 2,
    type: "preset",
  },
  {
    id: "p_1_5h_30_5_x3",
    name: "1.5 часа",
    focus: 30,
    break: 5,
    cycles: 3,
    type: "preset",
  },
  {
    id: "p_2h_50_10_x2",
    name: "2 часа",
    focus: 50,
    break: 10,
    cycles: 2,
    type: "preset",
  },
  {
    id: "p_deep_90_20",
    name: "Глубокая",
    focus: 90,
    break: 20,
    cycles: 1,
    type: "preset",
  },
  {
    id: "p_sprint_15_3",
    name: "Спринты",
    focus: 15,
    break: 3,
    cycles: 4,
    type: "preset",
  },
  {
    id: "p_2h_45_15_x2",
    name: "2 часа (45/15)",
    focus: 45,
    break: 15,
    cycles: 2,
    type: "preset",
  },
].map((p) => ({ ...p, total: totalMinutes(p.focus, p.break, p.cycles) }));

function planRow(p, removable) {
  const div = document.createElement("div");
  div.className = "item";
  const meta = `${p.focus}/${p.break} ×${p.cycles} · ≈ ${p.total} мин`;
  div.innerHTML = `
    <div class="name">${p.name}</div>
    <div class="meta">${meta}</div>
    <div class="act">
      <button class="icon" data-act="run" data-id="${p.id}">▶</button>
      ${
        removable
          ? `<button class="icon" data-act="del" data-id="${p.id}">✕</button>`
          : ""
      }
    </div>
  `;
  return div;
}

function renderMine() {
  if (!listMine) return;
  const arr = readCustom();
  listMine.innerHTML = "";
  if (!arr.length) {
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = `<div class="name">Пусто</div><div class="meta">Сохрани план во вкладке «Настроить»</div><div></div>`;
    listMine.appendChild(empty);
    return;
  }
  arr.forEach((p) => listMine.appendChild(planRow(p, true)));
}
function renderPresets() {
  if (!listPresets) return;
  listPresets.innerHTML = "";
  PRESETS.forEach((p) => listPresets.appendChild(planRow(p, false)));
}
renderMine();
renderPresets();

function applyPlan(p) {
  timer.reset();
  timer.setPreset(p.focus, p.break);
  timer.setCycles(p.cycles);
  sync();
  // меню можно оставить открытым; если хочешь — закрывай:
  // closeSB();
}

[listMine, listPresets].forEach((list) => {
  list?.addEventListener("click", (e) => {
    const btn = e.target.closest("button.icon");
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    if (!act || !id) return;

    if (list === listPresets) {
      const p = PRESETS.find((x) => x.id === id);
      if (!p) return;
      if (act === "run") applyPlan(p);
      // удалять пресеты нельзя
      return;
    }

    // Мои планы
    let arr = readCustom();
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return;

    if (act === "run") applyPlan(arr[idx]);
    else if (act === "del") {
      arr.splice(idx, 1);
      writeCustom(arr);
      renderMine();
    }
  });
});

// ---------- Accordion (категории) ----------
const accBtns = $$(".acc[data-acc]");
accBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.acc;
    const panel = key === "mine" ? $("#accMine") : $("#accPresets");
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", open ? "false" : "true");
    panel?.classList.toggle("is-open", !open);
  });
});
