// sfx.js — автоподбор формата
import { state } from "./state.js";

function safePlay(_aud) {
  // no-op пока нет звуков и чтобы не сыпались ошибки
}

export function playStart() {
  if (!state.sound) return;
  safePlay(null);
}
export function playEnd() {
  if (!state.sound) return;
  safePlay(null);
}
