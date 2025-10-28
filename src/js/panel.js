// Открытие/закрытие
const panel = document.getElementById("panel");
const backdrop = document.getElementById("panelBackdrop");
const openBtn = document.getElementById("openSettings");
const closeBtn = document.getElementById("closeSettings");

function openPanel() {
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  backdrop.classList.add("show");
}
function closePanel() {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("show");
}
openBtn?.addEventListener("click", openPanel);
closeBtn?.addEventListener("click", closePanel);
backdrop?.addEventListener("click", closePanel);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

// Навигация: рейка слева
const railBtns = [...document.querySelectorAll(".rail__btn")];
const sections = {
  plan: document.getElementById("sec-plan"),
  options: document.getElementById("sec-options"),
  history: document.getElementById("sec-history"),
};
railBtns.forEach((b) => {
  b.addEventListener("click", () => {
    railBtns.forEach((x) => x.classList.toggle("is-active", x === b));
    Object.entries(sections).forEach(([k, el]) =>
      el.classList.toggle("is-open", b.dataset.section === k)
    );
  });
});

// Табы внутри "План"
const tabs = [...document.querySelectorAll(".tab")];
const panes = {
  quick: document.getElementById("tab-quick"),
  presets: document.getElementById("tab-presets"),
  custom: document.getElementById("tab-custom"),
};
tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.toggle("is-active", x === t));
    Object.entries(panes).forEach(([k, el]) =>
      el.classList.toggle("is-open", t.dataset.tab === k)
    );
  });
});

// Быстро: режимы
const q = {
  f: document.getElementById("qFocus"),
  b: document.getElementById("qBreak"),
  cyc: document.getElementById("qCycles"),
  tot: document.getElementById("qTotal"),
  rowC: document.getElementById("qRowCycles"),
  rowT: document.getElementById("qRowTotal"),
  sum: document.getElementById("qSum"),
  sumT: document.getElementById("qSumT"),
  apply: document.getElementById("qApply"),
};
let qMode = "cycles";
document.querySelectorAll("#tab-quick .chip").forEach((ch) => {
  ch.addEventListener("click", () => {
    ch.parentElement
      .querySelectorAll(".chip")
      .forEach((x) => x.classList.toggle("is-active", x === ch));
    qMode = ch.dataset.mode;
    q.rowC.classList.toggle("hidden", qMode !== "cycles");
    q.rowT.classList.toggle("hidden", qMode !== "total");
    updateQuick();
  });
});
["input", "change"].forEach((ev) =>
  [q.f, q.b, q.cyc, q.tot].forEach((el) =>
    el?.addEventListener(ev, updateQuick)
  )
);
function fmt(min) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} ч`;
}
function updateQuick() {
  const f = +q.f.value || 0,
    b = +q.b.value || 0;
  if (qMode === "cycles") {
    const c = +q.cyc.value || 0;
    q.sum.textContent = `≈ ${fmt(c * (f + b) - b)}`;
  } else {
    const T = +q.tot.value || 0,
      c = Math.max(1, Math.floor((T + b) / (f + b)));
    q.sumT.textContent = `→ ${f}/${b} × ${c}`;
  }
}
updateQuick();
q.apply?.addEventListener("click", () => {
  const plan =
    qMode === "cycles"
      ? { focus: +q.f.value, break: +q.b.value, cycles: +q.cyc.value }
      : { focus: +q.f.value, break: +q.b.value, total: +q.tot.value };
  dispatch("plan:apply", normalize(plan));
  closePanel();
});

// Пресеты
const BUILTIN = [
  { name: "1 ч · 25/5×2", icon: "⏱️", focus: 25, break: 5, cycles: 2 },
  { name: "90 м · 30/15×2", icon: "🎯", focus: 30, break: 15, cycles: 2 },
  { name: "2 ч · 45/15×2", icon: "🔥", focus: 45, break: 15, cycles: 2 },
  { name: "52/17 ×1", icon: "📚", focus: 52, break: 17, cycles: 1 },
];
const presetList = document.getElementById("presetList");
presetList.innerHTML = "";
BUILTIN.forEach((p) => {
  const b = document.createElement("button");
  b.className = "pill";
  b.textContent = `${p.icon} ${p.name}`;
  b.addEventListener("click", () => {
    dispatch("plan:apply", p);
    closePanel();
  });
  presetList.appendChild(b);
});

// Custom
const c = {
  name: document.getElementById("cName"),
  icon: document.getElementById("cIcon"),
  f: document.getElementById("cFocus"),
  b: document.getElementById("cBreak"),
  cyc: document.getElementById("cCycles"),
  tot: document.getElementById("cTotal"),
  rowC: document.getElementById("cRowCycles"),
  rowT: document.getElementById("cRowTotal"),
  sum: document.getElementById("cSum"),
  sumT: document.getElementById("cSumT"),
};
let cMode = "cycles";
document.querySelectorAll("#tab-custom .chip").forEach((ch) => {
  ch.addEventListener("click", () => {
    ch.parentElement
      .querySelectorAll(".chip")
      .forEach((x) => x.classList.toggle("is-active", x === ch));
    cMode = ch.dataset.mode;
    c.rowC.classList.toggle("hidden", cMode !== "cycles");
    c.rowT.classList.toggle("hidden", cMode !== "total");
    updateCustom();
  });
});
["input", "change"].forEach((ev) =>
  [c.f, c.b, c.cyc, c.tot, c.name, c.icon].forEach((el) =>
    el?.addEventListener(ev, updateCustom)
  )
);
function updateCustom() {
  const f = +c.f.value || 0,
    b = +c.b.value || 0;
  if (cMode === "cycles") {
    const cyc = +c.cyc.value || 0;
    c.sum.textContent = `≈ ${fmt(cyc * (f + b) - b)}`;
  } else {
    const T = +c.tot.value || 0,
      cyc = Math.max(1, Math.floor((T + b) / (f + b)));
    c.sumT.textContent = `→ ${f}/${b} × ${cyc}`;
  }
}
updateCustom();
document.getElementById("cPreview")?.addEventListener("click", () => {
  const plan =
    cMode === "cycles"
      ? { focus: +c.f.value, break: +c.b.value, cycles: +c.cyc.value }
      : { focus: +c.f.value, break: +c.b.value, total: +c.tot.value };
  dispatch("plan:apply", normalize(plan));
  closePanel();
});
document.getElementById("cSave")?.addEventListener("click", () => {
  const base =
    cMode === "cycles"
      ? { focus: +c.f.value, break: +c.b.value, cycles: +c.cyc.value }
      : { focus: +c.f.value, break: +c.b.value, total: +c.tot.value };
  const payload = {
    ...normalize(base),
    name: c.name.value || `${c.f.value}/${c.b.value}`,
    icon: c.icon.value || "⭐",
  };
  dispatch("plan:save", payload);
  closePanel();
});

// История (заглушка + стрик)
const STATS_KEY = "pomodoro:stats";
const calRoot = document.getElementById("calendar");
const calInfo = document.getElementById("calInfo");
function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
  } catch {
    return {};
  }
}
function streak(stats, thr = 25) {
  let c = 0;
  for (let i = 0; ; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if ((stats[k]?.minutes || 0) >= thr) c++;
    else break;
  }
  return c;
}
function renderCalendar(now = new Date()) {
  if (!calRoot) return;
  calRoot.innerHTML = "";
  const y = now.getFullYear(),
    m = now.getMonth();
  const first = new Date(y, m, 1),
    days = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7,
    stats = loadStats();
  for (let i = 0; i < lead; i++)
    calRoot.appendChild(document.createElement("div"));
  for (let d = 1; d <= days; d++) {
    const el = document.createElement("div");
    el.className = "cal__day";
    const k = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
    const mins = stats[k]?.minutes || 0;
    if (mins > 0) el.style.background = "rgba(126,249,192,.22)";
    el.title = mins
      ? `${d}.${m + 1}.${y} · ${mins} мин`
      : `${d}.${m + 1}.${y} · 0 мин`;
    el.addEventListener("click", () => (calInfo.textContent = el.title));
    calRoot.appendChild(el);
  }
  const s = streak(stats, 25);
  const sc = document.getElementById("streakCount");
  if (sc) sc.textContent = s;
}
renderCalendar();

// helpers
function normalize(p) {
  if (p.total) {
    const cyc = Math.max(
      1,
      Math.floor((p.total + p.break) / (p.focus + p.break))
    );
    return { ...p, cycles: cyc, total: undefined };
  }
  return p;
}
function dispatch(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}
