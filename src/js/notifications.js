let blinkTimer = null;
let originalTitle = document.title;

export function initNotifications() {
  // можно запросить разрешение заранее, но делаем лениво при первом показе
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) stopTitleBlink();
  });
  window.addEventListener("focus", stopTitleBlink);
}

export async function notifyPhase(toPhase) {
  const title = toPhase === "focus" ? "Фокус" : "Перерыв";
  const body = toPhase === "focus" ? "Пора работать" : "Пора отдохнуть";

  // Пытаемся показать нативное уведомление
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

  // Фолбэк: мигаем заголовком вкладки
  startTitleBlink(`${title} — ${body}`);
}

function startTitleBlink(msg) {
  stopTitleBlink();
  let toggle = false;
  originalTitle = document.title;
  blinkTimer = setInterval(() => {
    document.title = toggle ? msg : originalTitle;
    toggle = !toggle;
  }, 900);
}

export function stopTitleBlink() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
    document.title = originalTitle;
  }
}
