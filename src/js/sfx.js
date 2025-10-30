// sfx.js — автоподбор формата
import { state } from "./state.js";

function pickSource(candidates) {
  const a = document.createElement("audio");
  for (const { src, type } of candidates) {
    if (!type || a.canPlayType(type) !== "") return src;
  }
  return null;
}

const startSrc = pickSource([
  { src: "./sfx/start.mp3", type: "audio/mpeg" },
  { src: "./sfx/start.ogg", type: "audio/ogg" },
]);
const endSrc = pickSource([
  { src: "./sfx/end.mp3", type: "audio/mpeg" },
  { src: "./sfx/end.ogg", type: "audio/ogg" },
]);

const startAud = startSrc ? new Audio(startSrc) : null;
const endAud = endSrc ? new Audio(endSrc) : null;

function safePlay(aud) {
  if (!aud) return;
  const p = aud.play();
  if (p && p.catch) p.catch(() => {});
}

export function playStart() {
  if (!state.sound) return;
  safePlay(startAud);
}
export function playEnd() {
  if (!state.sound) return;
  safePlay(endAud);
}
