// sfx.js
import { state } from "./state.js";
const el = {
  start: document.getElementById("sfxStart"),
  end: document.getElementById("sfxEnd"),
};
export function playStart() {
  try {
    state.sound && el.start.play();
  } catch (_) {}
}
export function playEnd() {
  try {
    state.sound && el.end.play();
  } catch (_) {}
}
