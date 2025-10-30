// sidebar.js — только меню (без темы)

(function () {
  const openBtn = document.getElementById("openSettings"); // ☰
  const closeBtn = document.getElementById("sbClose");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

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
})();
