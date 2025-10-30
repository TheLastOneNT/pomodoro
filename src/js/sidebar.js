// Базовые узлы
const openBtn = document.getElementById("openSettings"); // кнопка ☰ в топбаре
const themeBtn = document.getElementById("themeToggle"); // 🌙/🌞 в топбаре

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const closeBtn = document.getElementById("sbClose");
const themeSw = document.getElementById("sbTheme");

// Открыть/закрыть меню
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

// Тема
function applyThemeToBody(isNight) {
  document.body.classList.toggle("night", isNight);
  document.body.classList.toggle("day", !isNight);
  if (themeBtn) themeBtn.textContent = isNight ? "🌙" : "🌞";
}

const startNight = !document.body.classList.contains("day");
if (themeSw) {
  themeSw.checked = startNight;
  themeSw.addEventListener("change", () => {
    applyThemeToBody(!!themeSw.checked);
    document.dispatchEvent(
      new CustomEvent("theme:changed", { detail: { night: !!themeSw.checked } })
    );
  });
} else {
  applyThemeToBody(startNight);
}

// Синхронизация с верхней кнопкой
themeBtn?.addEventListener("click", () => {
  const isNight = !document.body.classList.contains("night");
  if (themeSw) themeSw.checked = isNight;
  applyThemeToBody(isNight);
  document.dispatchEvent(
    new CustomEvent("theme:changed", { detail: { night: isNight } })
  );
});
