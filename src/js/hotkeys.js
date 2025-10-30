import * as timer from "./timer.js";
import { state } from "./state.js";

export function initHotkeys() {
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && (e.target.tagName || "")).toLowerCase();
    if (
      tag === "input" ||
      tag === "textarea" ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey
    )
      return;

    switch (e.key.toLowerCase()) {
      case " ": // space — старт/пауза
        e.preventDefault();
        if (state.running) timer.pause();
        else timer.start();
        break;
      case "enter": // тоже старт/пауза
        if (state.running) timer.pause();
        else timer.start();
        break;
      case "s": // skip
        timer.skip();
        break;
      case "r": // reset
        timer.reset();
        break;
      // case "t": — тема у тебя уже на кнопке, можно при желании дергать клик
      default:
        break;
    }
  });
}
