let blinkTimer = null;
let originalTitle = document.title;

export function initNotifications() {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) stopTitleBlink();
  });
  window.addEventListener("focus", stopTitleBlink);
}

export async function notifyPhase(toPhase) {
  const title = toPhase === "focus" ? "Фокус" : "Перерыв";
  const body = toPhase === "focus" ? "Пора работать" : "Пора отдохнуть";

  // Попробуем нативные нотификации
  try {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
        return;
      } else if (Notification.permission !== "denied") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          new Notification(title, { body });
          return;
        }
      }
    }
  } catch (_) {}

  // Фолбэк — мигание <title>
  startTitleBlink(`${title} — ${body}`);
}

function startTitleBlink(msg) {
  stopTitleBlink();
  originalTitle = document.title;
  let on = false;
  blinkTimer = setInterval(() => {
    document.title = on ? msg : originalTitle;
    on = !on;
  }, 900);
}

export function stopTitleBlink() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
    document.title = originalTitle;
  }
}
