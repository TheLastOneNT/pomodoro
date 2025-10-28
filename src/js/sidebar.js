// Точки привязки к твоим уже существующим кнопкам
const openBtn = document.getElementById("openSettings"); // кнопка в топбаре ☰
const themeBtn = document.getElementById("themeToggle"); // кнопка в топбаре 🌙/🌞

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const collapse = document.getElementById("sbCollapse");
const closeBtn = document.getElementById("sbClose");
const themeSw = document.getElementById("sbTheme");

// Открыть/Закрыть
function openSB() {
  sidebar.classList.add("show");
  backdrop.classList.add("show");
  sidebar.setAttribute("aria-hidden", "false");
}
function closeSB() {
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

// Свёртывание
collapse?.addEventListener("click", () =>
  sidebar.classList.toggle("collapsed")
);

// Переключение активного пункта (и проброс события в приложение)
const items = [...document.querySelectorAll(".sb__item")];
items.forEach((btn) => {
  btn.addEventListener("click", () => {
    items.forEach((i) => i.classList.toggle("is-active", i === btn));
    document.dispatchEvent(
      new CustomEvent("sidebar:navigate", { detail: btn.dataset.section })
    );
  });
});

// Синхронизация темы: по умолчанию ночь => чекбокс включён
function applyThemeToBody(isNight) {
  document.body.classList.toggle("night", isNight);
  document.body.classList.toggle("day", !isNight);
  // синхроним и верхнюю иконку, если есть
  if (themeBtn) themeBtn.textContent = isNight ? "🌙" : "🌞";
}
const startNight = !document.body.classList.contains("day");
themeSw.checked = startNight;
applyThemeToBody(startNight);

// переключатель в сайдбаре
themeSw.addEventListener("change", () => {
  applyThemeToBody(themeSw.checked);
  document.dispatchEvent(
    new CustomEvent("theme:changed", { detail: { night: themeSw.checked } })
  );
});

// синхронизация с твоей верхней кнопкой темы (если ею пользуются)
themeBtn?.addEventListener("click", () => {
  const isNight = !document.body.classList.contains("night");
  themeSw.checked = isNight;
  applyThemeToBody(isNight);
  document.dispatchEvent(
    new CustomEvent("theme:changed", { detail: { night: isNight } })
  );
});
