// Меню «План занятий» (две вкладки: Настроить / Выбрать), единый список планов.
// Любой план: ▶ запустить, ✎ редактировать, ✕ удалить.
// Тема управляется в app.js, здесь её нет.

import * as timer from "./timer.js";
import { sync } from "./ui.js";

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v | 0));
const totalMinutes = (f, b, c) => c * (f + b);

// storage
const KEY_PLANS = "pomodoro:plans:all"; // массив планов любого типа

function lsGet(key, def = []) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

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

// ---------- default presets seed (попадут в общий список как type:'preset') ----------
const PRESET_SEED = [
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
    name: "Глубокая работа",
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

// миграция/инициализация
(function ensureSeed() {
  const cur = lsGet(KEY_PLANS, null);
  if (!cur || !Array.isArray(cur) || cur.length === 0) {
    lsSet(KEY_PLANS, PRESET_SEED.slice());
  } else {
    // если в списке нет ни одного пресета по id — можно дозалить недостающие
    const ids = new Set(cur.map((x) => x.id));
    let changed = false;
    for (const p of PRESET_SEED) {
      if (!ids.has(p.id)) {
        cur.push(p);
        changed = true;
      }
    }
    if (changed) lsSet(KEY_PLANS, cur);
  }
})();

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

const bEditTag = $("#bEditTag");
const bEditName = $("#bEditName");
const bCancelEdit = $("#bCancelEdit");

let editId = null; // если редактируем существующий план

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

function resetEditUI() {
  editId = null;
  bEditTag?.classList.add("hidden");
  bCancelEdit?.classList.add("hidden");
  bSaveBlock?.classList.add("hidden");
  bSave && (bSave.textContent = "Сохранить");
  bName && (bName.value = "");
}

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

bCancelEdit?.addEventListener("click", () => {
  resetEditUI();
});

bSave?.addEventListener("click", () => {
  const f = clamp(bFocus?.valueAsNumber || 25, 1, 180);
  const br = clamp(bBreak?.valueAsNumber || 5, 1, 60);
  const c = clamp(bCycles?.valueAsNumber || 4, 1, 20);
  const name =
    (bName?.value || "").trim() ||
    (editId ? bEditName?.textContent || "План" : "Мой план");

  const plans = lsGet(KEY_PLANS, []);
  if (editId) {
    // обновляем существующий
    const idx = plans.findIndex((x) => x.id === editId);
    if (idx >= 0) {
      plans[idx] = {
        ...plans[idx],
        name,
        focus: f,
        break: br,
        cycles: c,
        total: totalMinutes(f, br, c),
      };
      lsSet(KEY_PLANS, plans);
      renderPlans();
      resetEditUI();
      openTab("pick");
      return;
    }
  }

  // создаём новый кастомный
  const item = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    focus: f,
    break: br,
    cycles: c,
    total: totalMinutes(f, br, c),
    type: "custom",
  };
  plans.unshift(item);
  lsSet(KEY_PLANS, plans);
  renderPlans();
  resetEditUI();
  openTab("pick");
});

// ---------- PICK (Выбрать) ----------
const listPlans = $("#listPlans");

function planRow(p) {
  const div = document.createElement("div");
  div.className = "item";
  const meta = `${p.focus}/${p.break} ×${p.cycles} · ≈ ${p.total} мин`;
  div.innerHTML = `
  <div class="text">
    <span class="name">${p.name}</span>
    <span class="meta">• ${p.focus}/${p.break} ×${p.cycles} · ≈ ${p.total} мин</span>
  </div>
  <div class="act">
    <button class="icon" data-act="run"  data-id="${p.id}" aria-label="Запустить">▶</button>
    <button class="icon" data-act="edit" data-id="${p.id}" aria-label="Редактировать">✎</button>
    <button class="icon" data-act="del"  data-id="${p.id}" aria-label="Удалить">✕</button>
  </div>
`;
  return div;
}

function renderPlans() {
  if (!listPlans) return;
  const arr = lsGet(KEY_PLANS, []);
  listPlans.innerHTML = "";
  if (!arr.length) {
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = `<div class="name">Нет планов</div><div class="meta">Сохрани план во вкладке «Настроить»</div><div></div>`;
    listPlans.appendChild(empty);
    return;
  }
  arr.forEach((p) => listPlans.appendChild(planRow(p)));
}
renderPlans();

function applyPlan(p) {
  timer.reset();
  timer.setPreset(p.focus, p.break);
  timer.setCycles(p.cycles);
  sync();
}

listPlans?.addEventListener("click", (e) => {
  const btn = e.target.closest("button.icon");
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;
  if (!id || !act) return;

  const plans = lsGet(KEY_PLANS, []);
  const idx = plans.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const plan = plans[idx];

  if (act === "run") {
    applyPlan(plan);
  } else if (act === "del") {
    plans.splice(idx, 1);
    lsSet(KEY_PLANS, plans);
    renderPlans();
  } else if (act === "edit") {
    // переключаемся на «Настроить», подставляем значения и включаем режим редактирования
    openTab("build");
    if (bFocus) bFocus.value = String(plan.focus);
    if (bBreak) bBreak.value = String(plan.break);
    if (bCycles) bCycles.value = String(plan.cycles);
    updateBuildMeta();

    bSaveBlock?.classList.remove("hidden");
    bEditTag?.classList.remove("hidden");
    bCancelEdit?.classList.remove("hidden");
    if (bEditName) bEditName.textContent = plan.name;
    if (bName) {
      bName.value = plan.name;
      bName.focus();
    }
    if (bSave) bSave.textContent = "Сохранить изменения";

    editId = plan.id;
  }
});
