// notifications.js — web-уведомления + мигание title как фолбэк
// Экспорт: initNotifications, notifyPhase, stopTitleBlink

let blinkTimer = null;
let originalTitle = document.title;

const BLINK_INTERVAL_MS = 900;
const LISTENERS_FLAG = '__notif_listeners_once__';

// простая защита от “спама”: не дёргать уведомления чаще, чем раз в X мс,
// и не дублировать одно и то же состояние подряд
const THROTTLE_MS = 1200;
let lastNotifyAt = 0;
let lastPhase = null;

function canUseNativeNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function ensurePermission() {
  if (!canUseNativeNotifications()) return 'unsupported';
  try {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    // "default" → запрашиваем только по явному событию (смена фазы)
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'error';
  }
}

function showNativeNotification(title, body) {
  try {
    // на macOS/Windows уведомления всё равно проглатываются,
    // если окно в фокусе — логика сверху решает, когда их показывать
    new Notification(title, { body });
    return true;
  } catch {
    return false;
  }
}

function startTitleBlink(message) {
  stopTitleBlink();
  originalTitle = document.title || originalTitle || 'Pomodoro';
  let showMessage = false;

  // мигаем только если вкладка скрыта или окно не в фокусе — иначе раздражает
  const shouldBlink = () => document.hidden || !document.hasFocus();

  blinkTimer = setInterval(() => {
    if (!shouldBlink()) {
      // как только вкладка стала видимой — останавливаемся
      stopTitleBlink();
      return;
    }
    document.title = showMessage ? message : originalTitle;
    showMessage = !showMessage;
  }, BLINK_INTERVAL_MS);
}

export function stopTitleBlink() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
  }
  if (originalTitle) {
    document.title = originalTitle;
  }
}

export function initNotifications() {
  // вешаем слушатели ровно один раз за жизнь приложения
  if (window[LISTENERS_FLAG]) return;
  window[LISTENERS_FLAG] = true;

  document.addEventListener('visibilitychange', () => {
    // вернулись к вкладке — прекращаем мигать
    if (!document.hidden) stopTitleBlink();
  });

  // смена фокуса окна — тоже останавливаем
  window.addEventListener('focus', stopTitleBlink);
}

/**
 * Показать уведомление о следующей фазе.
 * Стратегия:
 *  - если вкладка видима или окно в фокусе → нативное уведомление не нужно, только фолбэк при необходимости
 *  - если вкладка скрыта → пробуем Web Notification, если нет — мигаем title
 *  - защита от повтора одинаковых фаз и слишком частых вызовов
 */
export async function notifyPhase(nextPhase) {
  const now = Date.now();
  if (lastPhase === nextPhase && now - lastNotifyAt < THROTTLE_MS) return;
  lastPhase = nextPhase;
  lastNotifyAt = now;

  const title = nextPhase === 'focus' ? 'Фокус' : 'Перерыв';
  const body = nextPhase === 'focus' ? 'Пора работать' : 'Пора отдохнуть';
  const message = `${title} — ${body}`;

  // Если окно на виду — визуального уведомления обычно достаточно (UI/звук).
  // Но на всякий — сбросим предыдущие мигания.
  if (!document.hidden && document.hasFocus()) {
    stopTitleBlink();
    return;
  }

  // вкладка скрыта → пытаемся web-уведомление
  const perm = await ensurePermission();
  if (perm === 'granted') {
    const ok = showNativeNotification(title, body);
    if (ok) return;
  }

  // если не получилось — мигаем в title
  startTitleBlink(message);
}
