// src/js/wheels.init.js
// Инициализация iOS-подобных колёс и мост со скрытыми инпутами.

export function initWheels() {
  const rowH = 40;
  const PAD = 3;
  const bridge = {
    focus: document.getElementById("bFocus"),
    break: document.getElementById("bBreak"),
    cycles: document.getElementById("bCycles"),
  };

  const makeList = (min, max) => {
    const ul = document.createElement("ul");
    for (let i = 0; i < PAD; i++)
      ul.appendChild(document.createElement("li")).textContent = "";
    for (let v = min; v <= max; v++) {
      const li = document.createElement("li");
      li.textContent = v;
      li.dataset.val = v;
      ul.appendChild(li);
    }
    for (let i = 0; i < PAD; i++)
      ul.appendChild(document.createElement("li")).textContent = "";
    return ul;
  };

  const scrollToVal = (el, min, val, smooth = true) => {
    const top = rowH * PAD + (val - min) * rowH;
    el.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  };

  const nearestVal = (el, min, max) => {
    const idx = Math.round((el.scrollTop - rowH * PAD) / rowH);
    return Math.max(min, Math.min(max, min + idx));
  };

  const updateBridge = (key, val) => {
    const input = bridge[key];
    if (!input) return;
    input.value = String(val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const markActive = (el, min, max) => {
    const val = nearestVal(el, min, max);
    el.querySelectorAll("li").forEach((li) => li.classList.remove("is-active"));
    const idx = val - min + PAD;
    const li = el.querySelectorAll("li")[idx];
    if (li) li.classList.add("is-active");
  };

  document.querySelectorAll(".wheel").forEach((wheelEl) => {
    const min = parseInt(wheelEl.dataset.min || "1", 10);
    const max = parseInt(wheelEl.dataset.max || "10", 10);
    const value = parseInt(wheelEl.dataset.value || String(min), 10);
    const key = wheelEl.dataset.key;

    const ul = makeList(min, max);
    wheelEl.appendChild(ul);

    // начальная позиция
    scrollToVal(wheelEl, min, value, false);
    updateBridge(key, value);
    markActive(wheelEl, min, max);

    let t;
    wheelEl.addEventListener("scroll", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const val = nearestVal(wheelEl, min, max);
        scrollToVal(wheelEl, min, val);
        updateBridge(key, val);
        markActive(wheelEl, min, max);
      }, 80);
    });

    wheelEl.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-val]");
      if (!li) return;
      const val = parseInt(li.dataset.val, 10);
      scrollToVal(wheelEl, min, val);
      updateBridge(key, val);
      markActive(wheelEl, min, max);
    });

    wheelEl.addEventListener(
      "wheel",
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );
  });
}
