// sidebar.js — меню «План занятий»: Настроить / Выбрать, общий список планов.
// Тема управляется в app.js. Добавлены: фокус-ловушка, возврат фокуса, ESC только при открытом сайдбаре.

import * as timer from "./timer.js";
import { sync } from "./ui.js";
import {
  fetchPlans,
  createPlan,
  updatePlan,
  deletePlan,
  setDefaultPlan,
} from "./plansApi.js";

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v | 0));
const totalMinutes = (f, b, c) => c * (f + b);

// ---------- open/close ----------
const openBtn = $("#openSettings");
const closeBtn = $("#sbClose");
const sidebar = $("#sidebar");
const backdrop = $("#sidebarBackdrop");

// фокус-ловушка + возврат фокуса
let lastActiveEl = null;
let trapHandlersBound = false;

function getFocusables(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
  );
}

function trapFocus(panel) {
  if (!panel || trapHandlersBound) return;
  trapHandlersBound = true;

  const els = () => getFocusables(panel);
  const onKeydown = (e) => {
    if (e.key !== "Tab") return;
    const list = els();
    if (!list.length) return;

    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // фокус на первый элемент панели
  const first = els()[0];
  if (first) first.focus();

  panel.addEventListener("keydown", onKeydown);
  panel._trapOff = () => panel.removeEventListener("keydown", onKeydown);
}

function releaseTrap() {
  if (!trapHandlersBound) return;
  trapHandlersBound = false;
  if (sidebar && sidebar._trapOff) {
    sidebar._trapOff();
    delete sidebar._trapOff;
  }
}

function openSB() {
  lastActiveEl = document.activeElement;
  sidebar?.classList.add("show");
  backdrop?.classList.add("show");
  sidebar?.setAttribute("aria-hidden", "false");
  trapFocus(sidebar);
}

function closeSB() {
  sidebar?.classList.remove("show");
  backdrop?.classList.remove("show");
  sidebar?.setAttribute("aria-hidden", "true");
  releaseTrap();

  // вернуть фокус туда, откуда открыли
  if (lastActiveEl && typeof lastActiveEl.focus === "function") {
    lastActiveEl.focus();
  } else {
    openBtn?.focus();
  }
}

openBtn?.addEventListener("click", openSB);
closeBtn?.addEventListener("click", closeSB);
backdrop?.addEventListener("click", closeSB);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebar?.classList.contains("show")) {
    closeSB();
  }
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
const bFocus = $("#bFocus"),
  bBreak = $("#bBreak"),
  bCycles = $("#bCycles");
const bMeta = $("#bMeta"),
  bApply = $("#bApply"),
  bSaveToggle = $("#bSaveToggle");
const bSaveBlock = $("#bSaveBlock"),
  bName = $("#bName"),
  bSave = $("#bSave");
const bEditTag = $("#bEditTag"),
  bEditName = $("#bEditName"),
  bCancelEdit = $("#bCancelEdit");
let editId = null;

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
  if (bSave) bSave.textContent = "Сохранить";
  if (bName) bName.value = "";
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

bSave?.addEventListener("click", async () => {
  const f = clamp(bFocus?.valueAsNumber || 25, 1, 180);
  const br = clamp(bBreak?.valueAsNumber || 5, 1, 60);
  const c = clamp(bCycles?.valueAsNumber || 4, 1, 20);
  const name =
    (bName?.value || "").trim() ||
    (editId ? bEditName?.textContent || "План" : "Мой план");

  if (editId) {
    await updatePlan(editId, {
      name,
      focus: f,
      break: br,
      cycles: c,
      total: totalMinutes(f, br, c),
    });
    renderPlans();
    resetEditUI();
    openTab("pick");
    return;
  }
  await createPlan({ name, focus: f, break: br, cycles: c });
  renderPlans();
  resetEditUI();
  openTab("pick");
});

// ---------- PICK (Выбрать) ----------
const listPlans = $("#listPlans");

function planRow(p) {
  const div = document.createElement("div");
  div.className = "item";
  div._plan = p;
  div.innerHTML = `
    <div class="text">
      <span class="name">${p.name}</span>
      <span class="meta">• ${p.focus}/${p.break} ×${p.cycles} · ≈ ${
    p.total ?? p.cycles * (p.focus + p.break)
  } мин</span>
    </div>
    <div class="act">
      <button class="icon" data-act="run"  data-id="${
        p.id
      }" aria-label="Запустить">▶</button>
      <button class="icon" data-act="edit" data-id="${
        p.id
      }" aria-label="Редактировать">✎</button>
      <button class="icon" data-act="del"  data-id="${
        p.id
      }" aria-label="Удалить">✕</button>
    </div>`;
  return div;
}

async function renderPlans() {
  if (!listPlans) return;
  const arr = await fetchPlans();
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

listPlans?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.icon");
  if (!btn) return;
  const id = btn.dataset.id,
    act = btn.dataset.act;
  if (!id || !act) return;

  if (act === "run") {
    const plans = await fetchPlans();
    const plan = plans.find((x) => String(x.id) === String(id));
    if (!plan) return;
    applyPlan(plan);
    closeSB();
  } else if (act === "del") {
    await deletePlan(id);
    renderPlans();
  } else if (act === "edit") {
    const plans = await fetchPlans();
    const plan = plans.find((x) => String(x.id) === String(id));
    if (!plan) return;
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

// (опционально, если где-то в проекте требуется программный вызов)
export { openSB, closeSB };
