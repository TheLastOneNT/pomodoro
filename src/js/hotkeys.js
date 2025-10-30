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
      case " ":
        e.preventDefault();
        if (state.running) timer.pause();
        else timer.start();
        break;
      case "enter":
        if (state.running) timer.pause();
        else timer.start();
        break;
      case "s":
        timer.skip();
        break;
      case "r":
        timer.reset();
        break;
      default:
        break;
    }
  });
}
