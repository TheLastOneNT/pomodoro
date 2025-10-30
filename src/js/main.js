import "./supa.js";
import "./state.js";
import "./storage.js";

import "./timer.js";
import "./ui.js";
import "./sidebar.js";
import "./sfx.js";
import "./app.js";

import { initAuth } from "./auth.js";
import { initWheels } from "./wheels.js";
import { initHotkeys } from "./hotkeys.js";
import {
  initNotifications,
  notifyPhase,
  stopTitleBlink,
} from "./notifications.js";
import { playEnd } from "./sfx.js";
import { showToast } from "./ui.js";

function boot() {
  initWheels();
  initAuth();
  initHotkeys();
  initNotifications();

  // ЕДИНСТВЕННЫЙ обработчик смены фазы: уведомление + звук + тост
  document.addEventListener("timer:phase", (e) => {
    const { from, to } = e.detail || {};
    notifyPhase(to);
    if (from === "focus") playEnd();
    showToast(to === "focus" ? "Фокус — поехали!" : "Перерыв — отдохни");
  });

  // Любой клик по документу — убираем мигающий title (фолбэк)
  document.addEventListener("pointerdown", stopTitleBlink, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
