// storage.js — единый слой работы с localStorage для состояния приложения.
// Сохраняем снапшот приложения (state) с версией схемы. Совместим с текущими save/load.

const NS = 'pomodoro';
const SCHEMA_VERSION = 3;
const KEY = `${NS}:v${SCHEMA_VERSION}`;
const FALLBACK_KEY_V2 = `${NS}:v2`;
const FALLBACK_KEY_V1 = `${NS}`;

// ——— низкоуровневые утилиты ———
function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ——— миграции прошлого снапшота в актуальную схему ———
function migrateToV3(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  // Пример мягкой миграции: убедимся, что поля есть и корректны
  const result = { ...snapshot };

  // durations.* в секундах
  if (!result.durations) result.durations = {};
  if (typeof result.durations.focusSec !== 'number') {
    const m = Number(result.durations.focusMin ?? 25) | 0;
    result.durations.focusSec = Math.max(60, m * 60);
  }
  if (typeof result.durations.breakSec !== 'number') {
    const m = Number(result.durations.breakMin ?? 5) | 0;
    result.durations.breakSec = Math.max(60, m * 60);
  }

  if (typeof result.remaining !== 'number') {
    result.remaining = result.durations.focusSec;
  }

  // поведение
  result.auto = !!result.auto;
  result.sound = !!result.sound;
  result.theme = result.theme === 'day' ? 'day' : 'night';

  // циклы
  if (result.cyclesTarget != null) {
    const v = Number(result.cyclesTarget) | 0;
    result.cyclesTarget = v > 0 ? v : null;
  } else {
    result.cyclesTarget = null;
  }
  result.cyclesDone = Number(result.cyclesDone) | 0;

  // статус
  const phases = new Set(['idle', 'focus', 'break']);
  result.phase = phases.has(result.phase) ? result.phase : 'idle';
  result.running = !!result.running;

  return result;
}

// ——— публичный API совместимый с текущим кодом ———
export function save(snapshot) {
  // Храним уже мигрированную и валидированную структуру; добавим служебное поле _ver
  const payload = { ...snapshot, _ver: SCHEMA_VERSION, _ts: Date.now() };
  safeSet(KEY, payload);
}

export function load() {
  // 1) пробуем v3
  let data = safeGet(KEY);
  if (data) return migrateToV3(data);

  // 2) попытка миграции со старых ключей
  const legacy = safeGet(FALLBACK_KEY_V2) || safeGet(FALLBACK_KEY_V1);
  if (legacy) {
    const migrated = migrateToV3(legacy);
    if (migrated) {
      // запишем в актуальный ключ
      save(migrated);
      return migrated;
    }
  }
  return null;
}

// ——— Доп. универсальные стораджи с неймспейсом ———
// Удобно для оффлайн-хранилищ (планы, дефолтный план и т.п.)
export function makeStore(suffix) {
  const k = `${NS}:${suffix}`;
  return {
    get(def = null) {
      const v = safeGet(k);
      return v == null ? def : v;
    },
    set(v) {
      safeSet(k, v);
    },
    remove() {
      try {
        localStorage.removeItem(k);
      } catch {}
    },
    key: k,
  };
}
