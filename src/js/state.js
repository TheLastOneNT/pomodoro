// src/js/state.js
// ----------------------------------------------------------------------------
// Central app state + tiny pub/sub + persistence of user prefs.
// Backward compatible: other modules may still read/write fields directly.
// Prefer using setters to keep notifications & persistence in sync.
// ----------------------------------------------------------------------------

/** @typedef {'idle' | 'focus' | 'break'} Phase */

const PREFS_KEY = 'pomodoro:prefs:v1';

/** @type {{
 *  phase: Phase,
 *  running: boolean,
 *  durations: { focusSec: number, breakSec: number },
 *  remaining: number,
 *  auto: boolean,
 *  sound: boolean,
 *  theme: 'night' | 'day',
 *  cyclesTarget: number | null,
 *  cyclesDone: number,
 *  intervalId: number | null,
 * }} */
export const state = {
  phase: 'idle',
  running: false,

  // seconds
  durations: {
    focusSec: 25 * 60,
    breakSec: 5 * 60,
  },

  remaining: 25 * 60,

  // UX prefs
  auto: true,
  sound: true,
  theme: 'night',

  // cycles: a "cycle" is a completed focus block
  cyclesTarget: null,
  cyclesDone: 0,

  // timer interval handler (setInterval id)
  intervalId: null,
};

// ----------------------------
// Minimal event bus (pub/sub)
// ----------------------------
/** @type {Map<string, Set<Function>>} */
const bus = new Map();

/**
 * Subscribe to state changes of a given key.
 * @param {string} key e.g. "phase", "remaining", "durations", "auto", "theme", "cycles"
 * @param {(value:any, key:string)=>void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(key, fn) {
  if (!bus.has(key)) bus.set(key, new Set());
  const set = bus.get(key);
  set.add(fn);
  return () => set.delete(fn);
}

/** @param {string} key @param {any} value */
function notify(key, value) {
  const set = bus.get(key);
  if (!set || set.size === 0) return;
  set.forEach((fn) => {
    try {
      fn(value, key);
    } catch (e) {
      // no-op: keep other listeners alive
      console.error('[state] listener error for', key, e);
    }
  });
}

// ----------------------------
// Persistence (user prefs only)
// ----------------------------
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function savePrefs() {
  const prefs = {
    auto: !!state.auto,
    sound: !!state.sound,
    theme: state.theme === 'day' ? 'day' : 'night',
  };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota
  }
}

/** Call once on app startup */
export function hydrateState() {
  const prefs = loadPrefs();
  if (!prefs) return;
  if (typeof prefs.auto === 'boolean') state.auto = prefs.auto;
  if (typeof prefs.sound === 'boolean') state.sound = prefs.sound;
  if (prefs.theme === 'day' || prefs.theme === 'night') state.theme = prefs.theme;

  notify('auto', state.auto);
  notify('sound', state.sound);
  notify('theme', state.theme);
}

// ----------------------------
// Setters (preferred API)
// ----------------------------
/** @param {Phase} phase */
export function setPhase(phase) {
  if (phase !== 'idle' && phase !== 'focus' && phase !== 'break') return;
  if (state.phase === phase) return;
  state.phase = phase;
  notify('phase', phase);
}

export function setRunning(isRunning) {
  if (state.running === !!isRunning) return;
  state.running = !!isRunning;
  notify('running', state.running);
}

export function setRemaining(seconds) {
  const v = Math.max(0, seconds | 0);
  if (state.remaining === v) return;
  state.remaining = v;
  notify('remaining', v);
}

/** @param {{focusSec?:number, breakSec?:number}} durs */
export function setDurations(durs) {
  let changed = false;
  if (typeof durs.focusSec === 'number' && durs.focusSec > 0) {
    state.durations.focusSec = durs.focusSec | 0;
    changed = true;
  }
  if (typeof durs.breakSec === 'number' && durs.breakSec > 0) {
    state.durations.breakSec = durs.breakSec | 0;
    changed = true;
  }
  if (changed) notify('durations', { ...state.durations });
}

export function setAuto(v) {
  const next = !!v;
  if (state.auto === next) return;
  state.auto = next;
  notify('auto', next);
  savePrefs();
}

export function setSound(v) {
  const next = !!v;
  if (state.sound === next) return;
  state.sound = next;
  notify('sound', next);
  savePrefs();
}

/** @param {'day'|'night'} theme */
export function setTheme(theme) {
  const next = theme === 'day' ? 'day' : 'night';
  if (state.theme === next) return;
  state.theme = next;
  notify('theme', next);
  savePrefs();
}

export function setCyclesTarget(n) {
  const val = n == null ? null : Math.max(1, n | 0);
  if (state.cyclesTarget === val) return;
  state.cyclesTarget = val;
  notify('cyclesTarget', val);
}

export function incrementCyclesDone() {
  state.cyclesDone = (state.cyclesDone | 0) + 1;
  notify('cyclesDone', state.cyclesDone);
}
export function resetCycles() {
  state.cyclesDone = 0;
  notify('cyclesDone', 0);
}

// Interval handle helpers (internal plumbing for timer.js)
export function attachInterval(id) {
  state.intervalId = id ?? null;
  notify('intervalId', state.intervalId);
}
export function clearIntervalRef() {
  state.intervalId = null;
  notify('intervalId', null);
}

// ----------------------------
// Utilities
// ----------------------------
export function getState() {
  // shallow copy to prevent accidental external mutation by spread
  return {
    ...state,
    durations: { ...state.durations },
  };
}

// For rare cases when legacy direct assignment happens, you may call:
export function forceNotify(key) {
  // allows manual notify after direct field mutations (back-compat)
  notify(key, /** @type any */ (state)[key]);
}
