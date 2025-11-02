let blinkTimer = null;
let originalTitle = document.title;

const BLINK_INTERVAL_MS = 900;

function canUseNativeNotifications() {
  return "Notification" in window;
}

async function showNativeNotification(title, body) {
  if (!canUseNativeNotifications()) return false;

  try {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, { body });
        return true;
      }
    }
  } catch (error) {
    console.warn("[notifications] native notification failed", error);
  }

  return false;
}

function startTitleBlink(message) {
  stopTitleBlink();
  originalTitle = document.title;
  let showMessage = false;

  blinkTimer = setInterval(() => {
    document.title = showMessage ? message : originalTitle;
    showMessage = !showMessage;
  }, BLINK_INTERVAL_MS);
}

export function stopTitleBlink() {
  if (!blinkTimer) return;
  clearInterval(blinkTimer);
  blinkTimer = null;
  document.title = originalTitle;
}

export function initNotifications() {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) stopTitleBlink();
  });
  window.addEventListener("focus", stopTitleBlink);
}

export async function notifyPhase(nextPhase) {
  const title = nextPhase === "focus" ? "Фокус" : "Перерыв";
  const body = nextPhase === "focus" ? "Пора работать" : "Пора отдохнуть";

  const displayed = await showNativeNotification(title, body);
  if (!displayed) {
    startTitleBlink(`${title} — ${body}`);
  }
}
