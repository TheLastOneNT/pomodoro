// hotkeys.js — горячие клавиши (идемпотентно)
// Экспорт: initHotkeys

import * as timer from './timer.js';
import { state } from './state.js';

const LISTENERS_FLAG = '__hotkeys_once__';

function isTextInputTarget(target) {
  if (!target) return false;

  const tag = (target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;

  // editable элементы
  if (target.isContentEditable) return true;

  // aria-textbox (например, кастомные компоненты)
  const role = (target.getAttribute && target.getAttribute('role')) || '';
  if (role.toLowerCase() === 'textbox') return true;

  return false;
}

function onKeyDown(e) {
  // не ломаем ввод в полях
  if (isTextInputTarget(e.target)) return;

  // модификаторы — не мешаем системным шорткатам
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.isComposing) return; // IME
  if (e.repeat) return; // удержание

  const key = (e.key || '').toLowerCase();

  switch (key) {
    case ' ':
    case 'enter': {
      e.preventDefault();
      if (state.running) timer.pause();
      else timer.start();
      break;
    }
    case 's': {
      // skip текущую фазу
      timer.skip();
      break;
    }
    case 'r': {
      // полный сброс
      timer.reset();
      break;
    }
    default:
      break;
  }
}

export function initHotkeys() {
  if (window[LISTENERS_FLAG]) return;
  window[LISTENERS_FLAG] = true;

  // слушаем на window, чтобы ловить клавиши даже когда фокус не на body
  window.addEventListener('keydown', onKeyDown, { capture: false });
}
