// storage.js
const KEY = "pomodoro:v3";
export function save(d) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (_) {}
}
export function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch (_) {
    return null;
  }
}
